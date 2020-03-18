import { ShapeGuards } from './guards';
import { Shape } from './shape';

export type Pointer<T extends Shape.Like> = T | ((is?: undefined) => T);
export namespace Pointer {
  export type Resolve<P extends Pointer<any>> = P extends (is?: undefined) => infer T ? T : P;
  export function resolve<P extends Pointer<any>>(pointer?: P): Resolve<P> {
    if (pointer === undefined) {
      return undefined as any;
    } else {
      return ShapeGuards.isShape(pointer) ? pointer : pointer();
    }
  }
}
