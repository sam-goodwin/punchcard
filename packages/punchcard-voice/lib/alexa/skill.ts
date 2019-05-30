import cdk = require('@aws-cdk/cdk');
import ask = require('ask-sdk-core');
import askModel = require('ask-sdk-model');
import { Client, Dependency, HList, Type } from 'punchcard';

export interface SkillProps<I extends Intents> {
  vendorId: string;
  name: string;
  locales: string[];
  intents: I;
}
export class Skill<I extends Intents> extends cdk.Construct {
  public readonly intents: I;

  constructor(scope: cdk.Construct, id: string, props: SkillProps<I>) {
    super(scope, id);
    this.intents = props.intents;
  }
}

export type Intents = Array<Intent<any>>;

export interface IntentProps<S extends Slots | undefined> {
  name: string;
  slots?: S;
  samples?: (locale: string) => string[];
}

export class Intent<S extends Slots | undefined> {
  public readonly name: string;
  public readonly slots: S | undefined;

  constructor(props: IntentProps<S>) {
    this.name = props.name;
    this.slots = props.slots;
  }
}

export type Slots = {
  [name: string]: Slot<any>;
};

export class Slot<T extends Type<any>> {
  public readonly type: SlotType<T>;
  public readonly samples?: (() => string[]);

  constructor(props: {
    type: SlotType<T>;
    samples?: () => string[];
  }) {
    this.type = props.type;
    this.samples = props.samples;
  }
}

export class SlotType<T extends Type<any>> {
  public readonly name: string;
  public readonly type: T;

  constructor(props: {
    name: string;
    type: T;
  }) {
    this.name = props.name;
    this.type = props.type;
  }
}

export interface Request {
  requestEnvelope: askModel.RequestEnvelope;
  context?: any;
  responseBuilder: ask.ResponseBuilder;
  serviceClientFactory?: askModel.services.ServiceClientFactory;
}

export interface IntentRequest<I extends Intent<any>> {
  request: Request;
  intent: RuntimeIntent<I>;
}

export type RuntimeIntent<I extends Intent<any>> = {
  [slotName in keyof I]+?: RuntimeSlot<I['slots'][slotName]>;
};

export type RuntimeSlot<S extends Slot<any>> =
  S extends Slot<infer V> ? V :
  S extends undefined ? undefined :
  never;

export class IntentHandler<I extends Intent<any>, D extends Dependency<any> | undefined> {
  public readonly intent: I;
  public readonly depends: D;
  public readonly handle: (request: IntentRequest<I>, deps: Client<D>) => Promise<askModel.Response>;

  constructor(props: {
    intent: I;
    depends?: D;
    handle: (request: IntentRequest<I>, deps: Client<D>) => Promise<askModel.Response>;
  }) {
    this.intent = props.intent;
    this.depends = props.depends!;
    this.handle = props.handle;
  }
}
