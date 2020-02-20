import { Thread } from './thread';

export class System {
  public static fork<T>(fn: (thread: Thread) => T): T {
    return fn(new Thread());
  }
}