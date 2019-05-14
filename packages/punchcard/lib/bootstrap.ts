import cdk = require('@aws-cdk/cdk');
import { getRuntime } from './constants';
import { Entrypoint } from './runtime';

export function bootstrap(app: cdk.App) {
  app.run = (() => {
    // no-op when at runtime
    console.log('cdk.App.run: no-op');
    return null as any;
  });

  let handler: (event: any, context: any) => Promise<any>;
  return async (event: any, context: any) => {
    if (!handler) {
      const runPath = getRuntime();
      const target = app.node.findChild(runPath);
      if (Entrypoint.isEntrypoint(target)) {
        handler = await target.boot();
      } else {
        throw new Error(`path '${runPath}' did not point to an Entrypoint`);
      }
    }
    return await handler(event, context);
  };
}

