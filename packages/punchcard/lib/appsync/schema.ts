import { getResolverPointer } from "./decorators";





export function buildSchema(resolvers: (new () => any)[]) {
  for (const resolver of resolvers) {
    const resolverMeta = getResolverPointer(resolver);
    if (resolverMeta === undefined) {
      throw new Error(`@Resolver missing from resolver type: ${resolver}`);
    }
    const resolverType = resolverMeta(null);
  }
}
