import { SQL } from './sql';

export function transaction<T>(f: () => SQL<T>): Promise<T> {
  throw new Error('todo');
}

export class Savepoint<ID extends string = string> {
  constructor(public readonly id: ID) {}
}

export function savepoint<ID extends string>(id: ID): SQL<Savepoint<ID>> {
  throw new Error('todo');
}

export function rollback(sp: Savepoint): SQL<void> {
  throw new Error('todo');
}