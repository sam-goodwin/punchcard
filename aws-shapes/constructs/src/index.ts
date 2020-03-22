export * from "./delivery-stream";
import {erasePattern} from "@punchcard/erasure";

// tell Punchcard to erase this module from the runtime bundle - it is only needed at build time.
erasePattern(/^@punchcard\/constructs$/);
