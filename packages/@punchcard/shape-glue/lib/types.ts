import { integer, Maximum, MaxLength, Minimum, MinLength, number, string, Trait } from "@punchcard/shape";

export function Type<T extends string>(glueType: T): Trait<any, { glueType: T; }> {
  return {
    [Trait.Data]: {
      glueType
    }
  };
}

export const tinyint = integer
  .apply(Type('tinyint'))
  .apply(Minimum(-128))
  .apply(Maximum(127))
  ;

export const smallint = integer
  .apply(Type('smallint'))
  .apply(Minimum(-32768))
  .apply(Maximum(32767))
  ;

export const bigint = integer
  .apply(Type('bigint'))
  .apply(Minimum(-9.223372e+18))
  .apply(Maximum(9.223372e+18))
  ;

export const float = number.apply(Type('float'));
export const double = number.apply(Type('double'));

const boundedString = <T extends string, N extends number>(type: T, n: N) => string
  .apply(Type(type))
  .apply(MinLength(0))
  .apply(MaxLength(n))
  ;

export const varchar = <N extends number>(n: N) => boundedString('varchar', n);
export const char = <N extends number>(n: N) => boundedString('char', n);
