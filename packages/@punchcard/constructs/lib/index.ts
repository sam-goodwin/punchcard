export * from './delivery-stream';

import erasure = require('@punchcard/erasure');

// tell Punchcard to erase this module from the runtime bundle - it is only needed at build time.
erasure.erasePattern(/^@punchcard\/constructs$/);
