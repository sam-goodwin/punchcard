import { MapShape } from '@punchcard/shape';
import { SubKind } from './symbols';
import { Thing } from './thing';

export class Map<T extends Thing> extends Thing<MapShape<Thing.GetType<T>>> {
  public readonly [SubKind]: 'map';

  public get(key: string): T {
    return null as any;
  }
}