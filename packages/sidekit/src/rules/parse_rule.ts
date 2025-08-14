import z from "zod";
import { schemas } from "../schemas.js";
import { SidekitRule } from "../types.js";
import fm from "front-matter";
import { InvalidSchemaException } from "../exceptions/invalid_schema_exception.js";

export function parseRule(id: string, content: string): SidekitRule {
  const data = (fm as any)(content);

  const rule = {
    ...data.attributes,
    id,
    content: data.body,
  };

  try {
    const parsed = schemas.rule.parse(rule);
    return parsed;
  } catch (e) {
    if (e instanceof z.ZodError) {
      throw new InvalidSchemaException(e, id);
    }
    throw e;
  }
}
