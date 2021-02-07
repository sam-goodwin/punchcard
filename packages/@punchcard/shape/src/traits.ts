export function Description<D extends string>(description: D): { description: D } {
  return {
    description
  };
}
