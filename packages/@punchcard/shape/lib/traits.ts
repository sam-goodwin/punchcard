import { Trait } from './metadata';

export function Description<D extends string>(description: D): Trait<any, { description: D }> {
  return {
    [Trait.Data]: {
      description
    }
  };
}
