import fm from "front-matter";
import { schemas } from "./schemas.js";
import { SidekickRule } from "./types.js";

export function parseRule(id: string, content: string): SidekickRule {
  const data = (fm as any)(content);

  return {
    id,
    meta: schemas.ruleMetadata.parse(data.attributes),
    content: data.body,
  };
}
