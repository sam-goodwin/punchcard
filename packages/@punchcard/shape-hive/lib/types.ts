import { integer, Maximum, MaxLength, Minimum, MinLength, number, string } from "@punchcard/shape";

export function HiveType<T extends string>(glueType: T): { glueType: T; } {
  return {
    glueType
  };
}

export const tinyint = integer
  .apply(HiveType('tinyint'))
  .apply(Minimum(-128))
  .apply(Maximum(127))
  ;

export const smallint = integer
  .apply(HiveType('smallint'))
  .apply(Minimum(-32768))
  .apply(Maximum(32767))
  ;

export const bigint = integer
  .apply(HiveType('bigint'))
  .apply(Minimum(-9.223372e+18))
  .apply(Maximum(9.223372e+18))
  ;

export const float = number.apply(HiveType('float'));
export const double = number.apply(HiveType('double'));

const boundedString = <T extends string, N extends number>(type: T, n: N) => string
  .apply(HiveType(type))
  .apply(MinLength(0))
  .apply(MaxLength(n))
  ;

export const varchar = <N extends number>(n: N) => boundedString('varchar', n);
export const char = <N extends number>(n: N) => boundedString('char', n);

