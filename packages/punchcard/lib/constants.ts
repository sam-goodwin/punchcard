export const RUNTIME_ENV = 'bootstrap_construct_path';

export const WEBPACK_MODE = 'punchcard:webpack:mode';
export const ENTRYPOINT_SYMBOL_NAME = 'punchcard:entrypoint';

export function isRuntime(): boolean {
  return tryGetRuntime() !== undefined;
}
export function getRuntime(): string {
  const r = tryGetRuntime();
  if (!r) {
    throw new Error(`environment does not contain '${RUNTIME_ENV}' environment varibable`);
  }
  return r;
}
export function tryGetRuntime(): string | undefined {
  return process.env[RUNTIME_ENV];
}
