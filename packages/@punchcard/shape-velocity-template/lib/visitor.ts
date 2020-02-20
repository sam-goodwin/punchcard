import { Json } from '@punchcard/shape-json';

import { ShapeGuards } from '@punchcard/shape';
import { NothingExpression } from './expression';
import { FunctionCall } from './function-call';
import { List } from './list';
import { Literal } from './literal';
import { Node } from './node';
import { Object } from './object';
import { Reference } from './reference';
import { ExpressionShape, ItemShape, ObjectExpression } from './symbols';
import { ToObjectVisitor } from './to-object-visitor';

export class Stack {
  private tokens: string[] = [];
  private counter: number = 0;

  public newId(): string {
    const i = this.counter;
    this.counter += 1;
    return `$v${i}`;
  }

  public write(token: string): void {
    this.tokens.push(token);
  }

  public build() {
    return this.tokens.join();
  }
}

export interface Scope {
  [id: string]: string | undefined;
}

export class Frame {
  public readonly lexicalScope: Scope = {};

  constructor(public readonly stack: Stack, public readonly parent?: Frame) {

  }

  public push(): Frame {
    return new Frame(this.stack, this);
  }

  public peek(): Frame {
    if (this.parent) {
      return this.parent;
    }
    throw new Error(`stack underflowed`);
  }

  public get(id: string): string | undefined {
    const val = this.lexicalScope[id];
    if (val !== undefined) {
      return val;
    } else if (this.parent) {
      return this.parent.get(id);
    } else {
      return undefined;
    }
  }
  /**
   * #set ( $v1 = value )
   */
  public set(value: string): string {
    const id = this.stack.newId();
    this.stack.write(`#set(${id} = ${value})`);
    return id;
  }
}

export function synthesize<O extends Object>(object: O) {
  const stack = new Stack();

  const expr = object[ObjectExpression];
  const shape = expr[ExpressionShape];

  if (Node.Guards.isLiteral(expr)) {
    stack.write(Json.stringifyMapper(shape).write(expr.value));
  } else if (ShapeGuards.isRecordShape(shape)) {
    
  } else if (ShapeGuards.isArrayShape(shape)) {
    stack.write('[');
    stack.write(']');
  } else {

  }
}

/*
_ => _.items
  .filter(item => item.name.isNotEmpty())
  .map(item => item.name)

#foreach ($item in $.root.items)
  #if(item.size() > 0)
    $item.name
  #end
#end

_ => _.items
  .filter(_ => _.name.isNotEmpty())
  .map(_ => _.accounts.map(_ => _.id))

#set($results = [])
#foreach($i in $.root.item)
  #if($i.size() > 0)
    #set($results2 = [])
    #foreach($a in $i.accounts)
      #(set $null = $results.add($a.id))
    #end
  #end
#end
#foreach($r in $results)

[#foreach ($item in $.root.items)
  #if(item.size() > 0)
    [#foreach($account in $item.accounts)
      "$account.id"#if($foreach.hasNext),#end
    #end]
  #end
#end]
*/