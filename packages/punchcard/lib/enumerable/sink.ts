
export interface SinkProps {
  retry?: Retry;

  /**
   * Enforces messages are sent in the same order as they are passed.
   *
   * @default false
   */
  strictOrdering?: boolean;
}

export interface Sink<T> {
  sink(values: Iterable<T>, prop?: SinkProps): Promise<void>;
}

export async function sink<T>(values: T[], tryPutBatch: (values: T[]) => Promise<T[]>, props: SinkProps = {}, batchSize: number): Promise<void> {
  if (values === undefined || values.length === 0) {
    return;
  }
  const retry = props.retry || {
    attemptsLeft: 3,
    backoffMs: 100,
    maxBackoffMs: 10000
  };
  const strictOrdering = props.strictOrdering === undefined ? false : props.strictOrdering;
  if (values.length <= batchSize) {
    const redrive = await tryPutBatch(values);
    if (redrive && redrive.length > 0) {
      if (retry.attemptsLeft === 0) {
        throw new Error(`failed to send records to Kinesis`);
      }
      return sink(redrive, tryPutBatch, {
        retry: {
          attemptsLeft: retry.attemptsLeft - 1,
          backoffMs:  Math.min(2 * retry.backoffMs,  retry.maxBackoffMs),
          maxBackoffMs: retry.maxBackoffMs
        }
      }, batchSize);
    }
  } else {
    if (strictOrdering) {
      for (const batch of chunk()) {
        await sink(batch, tryPutBatch, props, batchSize);
      }

      function* chunk(): IterableIterator<T[]> {
        let batch: T[] = [];
        for (const v of values) {
          batch.push(v);
          if (batch.length === batchSize) {
            yield batch;
            batch = [];
          }
        }
        if (batch) {
          yield batch;
        }
        return;
      }
    } else {
      await Promise.all([
        await sink(values.slice(0, Math.floor(values.length / 2)), tryPutBatch, props, batchSize),
        await sink(values.slice(Math.floor(values.length / 2), values.length), tryPutBatch, props, batchSize)
      ]);
    }
  }
}

export interface Retry {
  attemptsLeft: number;
  backoffMs: number;
  maxBackoffMs: number;
}
