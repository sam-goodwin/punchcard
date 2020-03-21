import { Shape } from '@punchcard/shape';
import { StatusCode } from './request-response';

import { JsonPath } from '@punchcard/shape-jsonpath';

export class Model<T extends Shape> {
  constructor(
    private readonly name: string,
    private readonly type: T) {}
}

export class Response<M extends Shape, Output extends Shape> {
  constructor(props: {
    model: Model<M>;
    output: Output;
    mapping: (output: JsonPath.Of<Output>) => M;
  }) {
    // do nothing
  }
}

export class BodyRequest<M extends Shape, Request> {
  constructor(props: {
    model: Model<M>;
    mapping: (input: JsonPath.Of<M>) => Request;
  }) {
    // do nothing
  }
}

export class BodyMethod<T extends Shape, Request extends Shape> {
  constructor(props: {
    request: BodyRequest<T, Request>,
    response: {
      [StatusCode.Ok]: Response<any, any>;
    } & {
      [Code in StatusCode]?: Response<any, any>;
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
