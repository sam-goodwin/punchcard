import { ShapeGuards } from './guards';
import { Shape } from './shape';

export type Pointer<T extends Shape> = T | ((is?: undefined) => T);
export namespace Pointer {
  export type Resolve<P extends Pointer<Shape>> =
    P extends Shape ? P :
    P extends (is?: undefined) => infer T ?
      T extends Shape ?
        T :
        never :
    never
    ;
  export function resolve<P extends Pointer<Shape>>(pointer?: P): Resolve<P> {
    if (pointer === undefined) {
      return undefined as any;
    } else {
      return ShapeGuards.isShape(pointer) ? pointer : ((pointer as any)());
    }
  }
}
