import { IEventSource } from '@aws-cdk/aws-lambda';
import { ClientContext } from "../runtime";
import { FunctorProps, IFunctor } from "./functor";

/**
 * Represents an event source, e.g. a Queue, Stream or Topic - anything
 * that can be subscribed to a Lambda Function.
 *
 * @typeparam E type of event
 * @typeparam T type of records yielded from this source (after transformation)
 * @typeparam C clients required at runtime
 * @typeparam P type of enumerate props, for configuring transformation infrastructure
 */
export interface ISource<E, T, C extends ClientContext, P extends FunctorProps> extends IFunctor<E, T, C, P> {
  eventSource(props: P): IEventSource;
}
