import AWS = require('aws-sdk');

import iam = require('@aws-cdk/aws-iam');
import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/core');

import fs = require('fs');
import path = require('path');

import { Global } from '../core';
import { Assembly, Namespace } from '../core/assembly';
import { Build } from '../core/build';
import { Cache } from '../core/cache';
import { Client } from '../core/client';
import { Dependency } from '../core/dependency';
import { Entrypoint, entrypoint } from '../core/entrypoint';
import { Resource } from '../core/resource';
import { Run } from '../core/run';
import { Json, Mapper, Raw, Shape } from '../shape';
import { ENTRYPOINT_SYMBOL_NAME, isRuntime, RUNTIME_ENV, WEBPACK_MODE } from '../util/constants';
import { Omit } from '../util/omit';

export interface FunctionProps<T, U, D extends Dependency<any> | undefined = undefined> {
  /**
   * Type of the request
   *
   * @default any
   */
  request?: Shape<T>;

  /**
   * Type of the response
   *
   * @default any
   */
  response?: Shape<U>;

  /**
   * Dependency resources which this Function needs clients for.
   *
   * Each client will have a chance to grant permissions to the function and environment variables.
   */
  depends?: D;

  /**
   * Function to handle the event of type `T`, given initialized client instances `Clients<C>`.
   */
  handle: (event: T, run: Client<D>, context: any) => Promise<U>;

  /**
   * Extra Lambda Function Props.
   */
  functionProps?: Build<Omit<lambda.FunctionProps, 'runtime' | 'code' | 'handler'>>
}

/**
 * Runs a function `T => U` in AWS Lambda with some runtime dependencies, `D`.
 *
 * @typeparam T input type
 * @typeparam U return type
 * @typeparam D runtime dependencies
 */
export class Function<T, U, D extends Dependency<any>> implements Entrypoint, Resource<lambda.Function> {
  public readonly [entrypoint] = true;
  public readonly filePath: string;

  /**
   * The Lambda Function CDK Construct.
   */
  public readonly resource: Build<lambda.Function>;

  /**
   * Entrypoint handler function.
   */
  public readonly entrypoint: Run<Promise<(event: any, context: any) => Promise<any>>>;

  /**
   * Function to handle the event of type `T`, given initialized client instances `Clients<D>`.
   *
   * @param event the parsed request
   * @param clients initialized clients to dependency resources
   */
  public readonly handle: (event: T, clients: Client<D>, context: any) => Promise<U>;

  private readonly request?: Shape<T>;
  private readonly response?: Shape<U>;
  private readonly dependencies?: D;

  constructor(scope: Build<cdk.Construct>, id: string, props: FunctionProps<T, U, D>) {
    const entrypointId = Global.addEntrypoint(this);

    this.resource = scope.chain(scope => (props.functionProps || Build.of({})).map(functionProps => {
      const lambdaFunction = new lambda.Function(scope, id, {
        ...functionProps,
        code: code(scope),
        runtime: lambda.Runtime.NODEJS_10_X,
        handler: 'index.handler',
      });
      lambdaFunction.addEnvironment('is_runtime', 'true');
      lambdaFunction.addEnvironment('entrypoint_id', entrypointId);

      const assembly = new Assembly();
      if (this.dependencies) {
        Build.resolve(this.dependencies.install)(assembly, lambdaFunction);
      }
      for (const [name, p] of Object.entries(assembly.properties)) {
        lambdaFunction.addEnvironment(name, p);
      }
      lambdaFunction.addEnvironment(RUNTIME_ENV, lambdaFunction.node.path);

      return lambdaFunction;
    }));

    this.entrypoint = Run.lazy(async () => {
      const bag: {[name: string]: string} = {};
      for (const [env, value] of Object.entries(process.env)) {
        if (env.startsWith('punchcard') && value !== undefined) {
          bag[env] = value;
        }
      }
      let client: Client<D> = undefined as any;

      if (this.dependencies) {
        const cache = new Cache();
        const runtimeProperties = new Assembly(bag);
        client = await (Run.resolve(this.dependencies.bootstrap))(runtimeProperties, cache);
      }
      const requestMapper: Mapper<T, any> = this.request === undefined ? Raw.passthrough() : Raw.forShape(this.request);
      const responseMapper: Mapper<U, any> = this.response === undefined ? Raw.passthrough() : Raw.forShape(this.response);
      return (async (event: any, context: any) => {
        const parsed = requestMapper.read(event);
        try {
          const result = await this.handle(parsed, client, context);
          return responseMapper.write(result);
        } catch (err) {
          console.error(err);
          throw err;
        }
      });
    });

    this.handle = props.handle;

    this.request = props.request;
    this.response = props.response;
    this.dependencies = props.depends;
  }

  /**
   * Depend on invoking this Function.
   */
  public invokeAccess(): Dependency<Function.Client<T, U>> {
    return {
      install: this.resource.map(fn => (ns, g) => {
        fn.grantInvoke(g);
        ns.set('functionArn', fn.functionArn);
      }),
      bootstrap: Run.of(async (ns, cache) => {
        const requestMapper: Mapper<T, string> = this.request === undefined ? Json.forAny() : Json.forShape(this.request);
        const responseMapper: Mapper<U, string> = this.response === undefined ? Json.forAny() : Json.forShape(this.response);
        return new Function.Client(
          cache.getOrCreate('aws:lambda', () => new AWS.Lambda()),
          ns.get('functionArn'),
          requestMapper,
          responseMapper
        );
      })
    };
  }
}

export namespace Function {
  /**
   * Client for invoking a Lambda Function
   */
  export class Client<T, U> {
    constructor(
      private readonly client: AWS.Lambda,
      private readonly functionArn: string,
      private readonly requestMapper: Mapper<T, string>,
      private readonly responseMapper: Mapper<U, string>) {}

    /**
     * Invoke the function synchronously and return the result.
     * @return Promise of the result
     */
    public async invoke(request: T): Promise<U> {
      const response = await this.client.invoke({
        FunctionName: this.functionArn,
        InvocationType: 'RequestResponse',
        Payload: this.requestMapper.write(request)
      }).promise();

      if (response.StatusCode === 200) {
        if (typeof response.Payload === 'string') {
          return this.responseMapper.read(response.Payload);
        } else if (Buffer.isBuffer(response.Payload)) {
          return this.responseMapper.read(response.Payload.toString('utf8'));
        } else {
          throw new Error(`Unknown response payload type: ${typeof response.Payload}`);
        }
      } else {
        throw new Error(`Function returned non-200 status code, '${response.StatusCode}' with error, '${response.FunctionError}'`);
      }
    }

    /**
     * Invoke the function asynchronously.
     */
    public async invokeAsync(request: T): Promise<void> {
      await this.client.invoke({
        FunctionName: this.functionArn,
        InvocationType: 'Event',
        Payload: this.requestMapper.write(request)
      }).promise();
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
  const app = findApp(scope);

  class MockCode extends lambda.Code {
    public readonly isInline: boolean = true;

    public bind(): lambda.CodeConfig {
      return {
        inlineCode: 'exports.handler = function(){ throw new Error("Mocked code is running, oops!");}'
      };
    }
  }

  if ((app as any)[codeSymbol] === undefined) {
    if (process.mainModule === undefined) {
      // console.warn('Mocking code, assuming its a unit test. Are you running the node process from another tool like jest?');
      return new MockCode();
    }
    const index = process.mainModule.filename;
    // TODO: probably better to stash things in the CWD instead of next to the app
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
      mode: scope.node.tryGetContext(WEBPACK_MODE) || 'production',
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
require('./app');
const entrypointId = process.env.entrypoint_id;
if (!entrypointId) {
  throw new Error('entrypoint_id environment variable is missing');
}
const state = global[Symbol.for('punchcard.global')];
if (!state) {
  throw new Error('global state missing');
}
const entrypoint = state.entrypoints[entrypointId];
if (!entrypoint) {
  throw new Error('entrypoint with id "' + entrypointId + '" does not exist');
}
var handler;
exports.handler = async (event, context) => {
  if (!handler) {
    handler = await entrypoint.entrypoint[Symbol.for('Runtime.get')]();
  }
  return await handler(event, context);
}
`);
    (app as any)[codeSymbol] = lambda.Code.asset(codePath);
  }

  return (app as any)[codeSymbol] as lambda.Code;
}
