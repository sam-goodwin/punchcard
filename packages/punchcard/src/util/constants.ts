export const ENTRYPOINT_ENV_KEY = 'entrypoint_id';
export const ENTRYPOINT_SYMBOL_NAME = 'punchcard:entrypoint';
export const GLOBAL_SYMBOL_NAME = 'punchcard.global';
export const IS_RUNTIME_ENV_KEY = 'is_runtime';
export const WEBPACK_MODE = 'punchcard_webpack_mode';

export function isRuntime(): boolean {
  return tryGetRuntime() !== undefined;
}
export function getRuntime(): string {
  const r = tryGetRuntime();
  if (!r) {
    throw new Error(`environment does not contain '${IS_RUNTIME_ENV_KEY}' environment varibable`);
  }
  return r;
}
export function tryGetRuntime(): string | undefined {
  return process.env[IS_RUNTIME_ENV_KEY];
}
export function setRuntime(): void {
  process.env[IS_RUNTIME_ENV_KEY] = 'runtime';
}
