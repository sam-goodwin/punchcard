/**
 * Global hook for communicating with Punchcard that any modules matching a regex
 * should be erased from runtime bundles.
 *
 * Use this with CDK infrastructure packages to allow their use within
 * application code as a dependency, but removed from the bundle as if
 * it were a devDependency.
 *
 * Use of these classes must then be restricted to within a Punchcard `Build` context.
 *
 * @param regex
 */
export function erasePattern(pattern: RegExp): void {
  patterns.push(pattern);
}

export function getPatterns(): RegExp[] {
  return patterns;
}

const erasure = Symbol.for('@punchcard/erasure');

declare const global: any;

if (global[erasure] === undefined) {
  global[erasure] = [];
}
const patterns = global[erasure];
