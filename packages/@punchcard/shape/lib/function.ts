import { Pointer } from './pointer';
import { Shape } from './shape';

export interface FunctionArgs {
  [argName: string]: Pointer<Shape>;
}

export interface FunctionShapeProps<Args extends FunctionArgs, Returns extends Shape> {
  args: Args;
  returns: Pointer<Returns>;
}

export class FunctionShape<Args extends FunctionArgs, Returns extends Shape> extends Shape {
  public readonly Kind: 'functionShape';
  public readonly FQN: string;

  constructor(
    public readonly args: Args,
    public readonly returns: Returns
  ) {
    super();
    // compute the FQN
    this.FQN = `(${Object.entries(args).map(([k, v]) => `${k}: ${v.FQN}`).join(',')}) => ${returns.FQN}`;
  }
}

export function VFunction<Args extends FunctionArgs, Returns extends Shape>(
  props: FunctionShapeProps<Args, Returns>
): FunctionShape<Args, Returns> {
  return new FunctionShape(props.args, props.returns);
}