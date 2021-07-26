export * from './delivery-stream';
export * from './log-group-event-source';

import erasure = require('@punchcard/erasure');

// tell Punchcard to erase this module from the runtime bundle - it is only needed at build time.
erasure.erasePattern(/^@punchcard\/constructs$/);
