import { Member } from "./member";
import { Shape } from "./shape";

export interface Visitor {
  shape<S extends Shape>(shape: S): void;
  member<M extends Member>(member: M): void;
}