import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/core');

import fs = require('fs');
import path = require('path');

import { WEBPACK_MODE } from '../util/constants';
import { Build } from './build';
import { Entrypoint } from './entrypoint';

class MockCode extends lambda.Code {
  public readonly isInline: boolean = true;

  public bind(): lambda.CodeConfig {
    return {
      inlineCode: 'exports.handler = function(){ throw new Error("Mocked code is running, oops!");}'
    };
  }
}

export namespace Code {
  const symbol = Symbol.for('punchcard:code');

  export const mock = new MockCode();

  function findApp(c: cdk.IConstruct): cdk.App {
    while (c.node.scope !== undefined) {
      c = c.node.scope;
    }
    return c as cdk.App;
  }

  export function getCode(scope: cdk.Construct): lambda.Code {
    const c = tryGetCode(scope);
    if (!c) {
      throw new Error('code does not exist on app');
    }
    return c;
  }

  export function tryGetCode(scope: cdk.Construct): lambda.Code | undefined {
    return (findApp(scope) as any)[symbol];
  }

  export function initCode(app: cdk.App, cb: (code: lambda.Code) => void): void {
    class MockCode extends lambda.Code {
      public readonly isInline: boolean = true;

      public bind(): lambda.CodeConfig {
        return {
          inlineCode: 'exports.handler = function(){ throw new Error("Mocked code is running, oops!");}'
        };
      }
    }

    if ((app as any)[symbol] === undefined) {
      if (process.mainModule === undefined) {
        // console.warn('Mocking code, assuming its a unit test. Are you running the node process from another tool like jest?');
        cb(new MockCode());
        return;
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
        mode: app.node.tryGetContext(WEBPACK_MODE) || 'production',
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
      // TODO: fix this - it's async so the code asset is usually built before the file is written
      compiler.run((err: Error) => {
        if (err) {
          console.log(err);
        }
        (app as any)[symbol] = lambda.Code.asset(codePath);
        cb((app as any)[symbol]);
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
    }
  }
}
