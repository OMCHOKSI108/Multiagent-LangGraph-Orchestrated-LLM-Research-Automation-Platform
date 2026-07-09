import { mapSchema, getDirective, MapperKind } from "@graphql-tools/utils";
import { GraphQLSchema, defaultFieldResolver } from "graphql";

const directiveName = "auth";

interface GraphQLContext {
  user: Record<string, unknown> | null;
}

export function authDirectiveTransformer(schema: GraphQLSchema): GraphQLSchema {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const directive = getDirective(schema, fieldConfig, directiveName)?.[0];
      if (!directive) return;

      const originalResolver = fieldConfig.resolve ?? defaultFieldResolver;
      fieldConfig.resolve = async (source, args, context: GraphQLContext, info) => {
        if (!context.user) {
          throw new Error("Not authenticated");
        }
        return originalResolver(source, args, context, info);
      };
      return fieldConfig;
    },
  });
}
