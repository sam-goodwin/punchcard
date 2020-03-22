import { Record, RecordMembers, RecordType, Shape } from "@punchcard/shape";
import { Construct } from "../../core/construct";
import { Expression } from "../intepreter/expression";
import { $api, Resolver } from "../syntax";
import { VObject } from "./object";

/**
 * Creates a new GraphQL type that supports resolver fields.
 *
 * @param members
 */
export function GraphQLResolver<M extends RecordMembers>(members: M): {
  Record: RecordType<M>;
} & Construct.Class<Construct & {
  Shape: RecordType<M>;
  $: VObject.Of<RecordType<M>>;
  $field: <T extends Shape.Like>(type: T) => Resolver<{}, Shape.Resolve<T>>;
}> {
  const record = Record(members);
  return class NewType extends Construct {
    public static readonly Record = record;

    public readonly Shape = record;

    /**
     * A reference to `$context.source` as "this".
     */
    public readonly $this = VObject.of(record, new Expression('$context.source'));
    public readonly $ = this.$this;

    public $field<T extends Shape.Like>(type: T): Resolver<{}, Shape.Resolve<T>> {
      return $api({}, type);
    }
  };
}