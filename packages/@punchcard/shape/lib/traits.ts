import { Trait } from './metadata';

export const Optional: Trait<any, { nullable: true }> = {
  [Trait.Data]: {
    nullable: true
  }
};

export function Description<D extends string>(description: D): Trait<any, { description: D }> {
  return {
    [Trait.Data]: {
      description
    }
  };
}
