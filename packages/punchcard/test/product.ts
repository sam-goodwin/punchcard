import { NumberShape, StringShape } from '@punchcard/shape';

// tslint:disable: no-unused-expression

export type Option =
  | Select<SelectProps<SelectAmount, SelectCandidates>, SelectCandidates>
  | YesOrNoOption
  | OptionGroup<any>
;

export interface OptionProps {
  /**
   * @default false
   */
  readonly optional?: true;
  /**
   * @default none
   */
  readonly comment?: string;
}

export type SelectShape = StringShape | NumberShape;
export type SelectCandidate = {
  readonly display: string;
};
export type SelectCandidates = {
  readonly [candidateId in string | number]: SelectCandidate;
};

export type SelectAmount =
  | 'one'
  | 'many'
;
export type Select<
  P extends SelectProps<SelectAmount, C>,
  C extends SelectCandidates
> = P & {
  readonly type: 'select';
};

export interface SelectProps<A extends SelectAmount, C extends SelectCandidates> extends OptionProps {
  readonly amount: A;
  readonly default?: keyof C
}
export function select<
  P extends SelectProps<SelectAmount, C>,
  C extends SelectCandidates
>(
  props: P,
  candidates: C,
): Select<P, C> {
  return {
    type: 'select',
    ...props
  } as any;
}

export interface YesOrNoOption extends OptionProps {
  readonly type: 'binary';
  readonly default?: boolean;
}
export interface YesOrNoProps {
  readonly default?: boolean;
}

export function yesOrNo(): YesOrNoOption & {
  readonly default: false;
};
export function yesOrNo<T extends YesOrNoProps>(props: T): YesOrNoOption & T;
export function yesOrNo(props?: YesOrNoOption) {
  return props || {
    default: false
  };
}

export interface Options {
  readonly [optionName: string]: Option;
}
type OptionParameters<O extends Options> = {
  readonly [name in keyof O]:
    O[name] extends { optional: true; } ?
      undefined | _OptionParameter<O[name]> :
      _OptionParameter<O[name]>
  ;
};
type _OptionParameter<O extends Option> =
  O extends Select<infer Props, infer C> ?
    Props['amount'] extends 'one' ? keyof C :
    Props['amount'] extends 'many' ? (keyof C)[] :
    never :
  O extends YesOrNoOption ? boolean :
  O extends OptionGroup<infer o> ? OptionParameters<o> :
  never
;
export interface OptionGroup<O extends Options> {
  readonly options: O;
  new<P extends OptionParameters<O>>(values: P): P;
}
export function OptionGroup<O extends Options>(options: O): OptionGroup<O> {
  return class <P extends OptionParameters<O>> {
    public static readonly options: O = options;
    constructor(values: P) {
      for (const [name, value] of Object.entries(values)) {
        (this as any)[name] = value;
      }
    }
  } as any;
}

export interface FormatOptions extends InstanceType<typeof FormatOptions> {}
const FormatOptions = OptionGroup({
  /**
   * Format Docs.
   */
  format: select({
    amount: 'one',
    default: 'standard.spiral',
  } as const, {
    'standard.spiral': {
      display: 'Standard Spiral'
    },
    'standard.paperback': {
      display: 'Standard Paperback',
    }
  } as const),
  length: select({
    amount: 'one',
    default: 6,
    optional: true,
  } as const, {
    6: {
      display: '6 months',
    },
    12: {
      display: '12 months',
    }
  } as const),
  physical: yesOrNo({
    default: true
  }),
  digital: yesOrNo()
});

// create a new instance of the option set
const options = new FormatOptions({
  format: 'standard.spiral',
  length: 6,
  digital: false,
  physical: true
});
// it retains the literal values passed in:
options.format; // 'standard.paperback'
options.length; // 6
options.digital; // false
options.physical; // true

// we use the general type `FormatOption` to pass around opaque values in code
const a: FormatOptions = options;
a.format; // 'standard.spiral' | 'standard.paperback'
a.length; // 6 | 12
a.digital; // boolean
a.physical; // boolean

console.log(JSON.stringify(options, null , 2));
/*
{
  "format": "standard.paperback",
  "length": 6,
  "digital": false,
  "physical": true
}
*/


function StringList<
  A extends SelectAmount,
  C extends {
    [id: string]: {
      display: string;
    }
  },
  D extends keyof C | undefined
>(props: {
  readonly amount: A;
  readonly choices: C;
  readonly default: D
}): typeof props {
  return null as any;
}

const aa = StringList({
  amount: 'one',
  default: 'Alamanc',
  choices: {
    Alamanc: {
      display: 'Thing'
    }
  },
});
