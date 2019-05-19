import AWS = require('aws-sdk');

import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/cdk');
import { ENTRYPOINT_SYMBOL_NAME, isRuntime, RUNTIME_ENV, WEBPACK_MODE } from '../constants';
import { Client, Entrypoint, entrypoint, Lifted, Runtime, RuntimeContext } from '../runtime';
import { Mapper, Raw } from '../shape';
import { Omit } from '../utils';

import fs = require('fs');
import path = require('path');
import { Cache, PropertyBag } from '../property-bag';

export type FunctionProps<T, U, C extends RuntimeContext> = {
  requestMapper?: Mapper<T, any>;
  responseMapper?: Mapper<U, any>;
  context?: C;
  handle: (event: T, run: Lifted<C>, context: any) => Promise<U>;
} & Omit<lambda.FunctionProps, 'runtime' | 'code' | 'handler'>;

export class Function<T, U, C extends RuntimeContext>
    extends lambda.Function
    implements Entrypoint, Client<Function.Client<T, U>> {
  public readonly [entrypoint] = true;
  public readonly filePath: string;

  public readonly handle: (event: T, run: Lifted<C>, context: any) => Promise<U>;

  private readonly requestMapper: Mapper<T, any>;
  private readonly responseMapper: Mapper<U, any>;
  private readonly context?: C;

  constructor(scope: cdk.Construct, id: string, props: FunctionProps<T, U, C>) {
    super(scope, id, {
      ...props,
      code: code(scope),
      runtime: new lambda.Runtime('nodejs10.x', lambda.RuntimeFamily.NodeJS, {supportsInlineCode: true}),
      handler: 'index.handler'
    });

    this.handle = props.handle;

    this.requestMapper = props.requestMapper || Raw.passthrough();
    this.responseMapper = props.responseMapper || Raw.passthrough();
    this.context = props.context;

    const properties = new PropertyBag(this.node.uniqueId, {});
    if (this.context) {
      for (const [name, r] of Object.entries(this.context)) {
        r.install({
          grantable: this,
          properties: properties.push(name)
        });
      }
    }
    for (const [name, p] of Object.entries(properties.properties)) {
      this.addEnvironment(name, p);
    }
    this.addEnvironment(RUNTIME_ENV, this.node.path);
  }

  public async boot(): Promise<(event: any, context: any) => Promise<U>> {
    const bag: {[name: string]: string} = {};
    for (const [env, value] of Object.entries(process.env)) {
      if (env.startsWith(this.node.uniqueId) && value !== undefined) {
        bag[env] = value;
      }
    }
    const cache = new Cache();
    const runtimeProperties = new PropertyBag(this.node.uniqueId, bag);

    const run: Lifted<C> = {} as any;

    if (this.context) {
      for (const [name, r] of Object.entries(this.context)) {
        run[name] = r.bootstrap(runtimeProperties.push(name), cache);
      }
    }

    return (async (event: any, context) => {
      const parsed = this.requestMapper.read(event);
      const result = await this.handle(parsed, run, context);
      return this.responseMapper.write(result);
    });
  }

  public install(target: Runtime): void {
    this.grantInvoke(target.grantable);
    target.properties.set('functionArn', this.functionArn);
  }

  public bootstrap(properties: PropertyBag, cache: Cache): Function.Client<T, U> {
    return new Function.Client(
      cache.getOrCreate('aws:lambda', () => new AWS.Lambda()),
      properties.get('functionArn'),
      this.requestMapper,
      this.responseMapper
    );
  }
}

export namespace Function {
  export class Client<T, U> {
    constructor(
      private readonly client: AWS.Lambda,
      private readonly functionArn: string,
      private readonly requestMapper: Mapper<T, string>,
      private readonly responseMapper: Mapper<U, string>) {}

    public async invoke(request: T): Promise<U> {
      const response = await this.client.invoke({
        FunctionName: this.functionArn,
        InvocationType: 'RequestResponse',
        Payload: this.requestMapper.write(request)
      }).promise();

      if (response.StatusCode === 200) {
        if (typeof response.Payload === 'string') {
          return this.responseMapper.read(response.Payload);
        } else {
          if (Buffer.isBuffer(response.Payload)) {
            return this.responseMapper.read(response.Payload.toString('utf8'));
          } else {
            throw new Error(`Unknown response payload type: ${typeof response.Payload}`);
          }
        }
      } else {
        throw new Error(`Function returned non-200 status code, '${response.StatusCode}' with error, '${response.FunctionError}'`);
      }
    }
  }
}

function findApp(c: cdk.IConstruct): cdk.App {
  while (c.node.scope !== undefined) {
    c = c.node.scope;
  }
  return c as cdk.App;
}

const codeSymbol = Symbol.for('punchcard:code');
export function code(scope: cdk.IConstruct): lambda.Code {
  if (isRuntime()) {
    class MockCode extends lambda.Code {
      public readonly isInline: boolean = false;
      public _toJSON(_resource?: cdk.CfnResource): lambda.CfnFunction.CodeProperty {
        return {};
      }
    }
    return new MockCode();
  }

  const app = findApp(scope);
  if ((app as any)[codeSymbol] === undefined) {
    const index = process.mainModule!.filename;
    const dist = path.resolve(path.dirname(index), '.punchcard');
    const name = path.basename(index, '.js');
    const codePath = path.join(dist, name);
    // HACK: this block is effectively erased at runtime:
    // 1) it is guarded by an environment variable expected to only be set at runtime
    // 2) webpack removes calls to itself, i.e. require('webpack')
    if (!fs.existsSync(dist)) {
      fs.mkdirSync(dist);
    }
    if (!fs.existsSync(codePath)) {
      fs.mkdirSync(codePath);
    }

    const webpack = require('webpack');
    const compiler = webpack({
      mode: scope.node.getContext(WEBPACK_MODE) || 'production',
      entry: index,
      target: 'node',
      output: {
        path: codePath,
        filename: 'app.js',
        libraryTarget: 'umd',
      },
      externals: ['aws-sdk', 'webpack'],
      plugins: [new webpack.IgnorePlugin({
        resourceRegExp: /^webpack$/ // don't generate imports for webpack
      })]
    });
    compiler.run((err: Error) => {
      if (err) {
        console.log(err);
      }
    });
    fs.writeFileSync(path.join(codePath, 'index.js'), `
const app = require('./app').default;

if (app === undefined) {
  throw new Error('app is null, are you exporting your cdk.App as the default in your main module (i.e. index.js)?');
}

app.run = (() => {
  // no-op when at runtime
  console.log('cdk.App.run: no-op');
  return null;
});

var handler;
exports.handler = async (event, context) => {
  if (!handler) {
    const runPath = process.env['${RUNTIME_ENV}'];
    const target = app.node.findChild(runPath);
    if (target[Symbol.for('${ENTRYPOINT_SYMBOL_NAME}')] === true) {
      handler = await target.boot();
    } else {
      throw new Error(\`path '\${runPath}' did not point to an Entrypoint\`);
    }
  }
  return await handler(event, context);
};
`);
    (app as any)[codeSymbol] = lambda.Code.asset(codePath);
  }

  return (app as any)[codeSymbol] as lambda.Code;
}
