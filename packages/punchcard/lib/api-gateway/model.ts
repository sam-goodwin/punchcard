import { InferJsonPathType, Shape } from '../shape';
import { StatusCode } from './request-response';

export class Model<T extends Shape<any>> {
  constructor(
    private readonly name: string,
    private readonly type: T) {}
}

export class Response<M extends Shape<any>, Output extends Shape<V>, V> {
  constructor(props: {
    model: Model<M>;
    output: Output;
    mapping: (output: InferJsonPathType<Output>) => M;
  }) {
    // do nothing
  }
}

export class BodyRequest<M extends Shape<any>, Request> {
  constructor(props: {
    model: Model<M>;
    mapping: (input: InferJsonPathType<M>) => Request;
  }) {
    // do nothing
  }
}

export class BodyMethod<T extends Shape<any>, Request extends Shape<any>> {
  constructor(props: {
    request: BodyRequest<T, Request>,
    response: {
      [StatusCode.Ok]: Response<any, any, any>;
    } & {
      [Code in StatusCode]?: Response<any, any, any>;
    }
  }) {
    // do nothing
  }
}

// const request = new BodyMethod({
//   request: new BodyRequest({
//     model: new Model('request', struct({
//       key: string(),
//       items: array(struct({
//         name: string(),
//         count: integer()
//       }))
//     })),
//     mapping: request => ({
//       names: request.fields.items.map(item => item.fields.name)
//     })
//   }),
//   response: {
//     [StatusCode.Ok]: new Response({
//       model: new Model('response', struct({
//         key: string(),
//         items: map(struct({
//           name: string(),
//           count: integer()
//         }))
//       })),
//       output: struct({
//         items: map(struct({
//           name: string(),
//           count: integer()
//         }))
//       }),
//       mapping: output => ({
//         key: $context.apiId,
//         items: output.fields.items
//       })
//     })
//   }
// });
