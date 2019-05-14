import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/cdk');
import { isRuntime, RUNTIME_ENV, WEBPACK_MODE, ENTRYPOINT_SYMBOL_NAME } from '../constants';
import { Entrypoint, entrypoint } from '../runtime';
import { Context, PropertyBag, RunContext, RuntimePropertyBag } from '../runtime';
import { Mapper, Raw } from '../shape';
import { Omit } from '../utils';

import fs = require('fs');
import path = require('path');

export type FunctionProps<T, U, C extends Context> = {
  requestMapper?: Mapper<T, any>;
  responseMapper?: Mapper<U, any>;
  context?: C;
  handle: (event: T, run: RunContext<C>, context: any) => Promise<U>;
} & Omit<lambda.FunctionProps, 'runtime' | 'code' | 'handler'>;

export class Function<T, U, C extends Context> extends lambda.Function implements Entrypoint {
  public readonly [entrypoint] = true;
  public readonly filePath: string;

  public readonly handle: (event: T, run: RunContext<C>, context: any) => Promise<U>;

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
    const runtimeProperties = new RuntimePropertyBag(this.node.uniqueId, bag, {});

    const run: RunContext<C> = {} as any;

    if (this.context) {
      for (const [name, r] of Object.entries(this.context)) {
        run[name] = r.run(runtimeProperties.push(name));
      }
    }

    return (async (event: any, context) => {
      const parsed = this.requestMapper.read(event);
      const result = await this.handle(parsed, run, context);
      return this.responseMapper.write(result);
    });
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
  throw new Error('app is null, are you exporting your cdk.App as the default in your app module?');
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
