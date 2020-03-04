import { Integer } from "./representation";

export interface SequenceProps {
  sequenceName: string;
  start: number;
  increment: number;
}

export class Sequence {
  constructor(props: SequenceProps) {}

  public next(): Integer {
    
  }
}