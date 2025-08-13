import { schemas } from "./schemas.js";
import { SidekitRule } from "./types.js";
import fm from "front-matter";

export function parseRule(content: string): SidekitRule {
  const data = (fm as any)(content);
  const rule = {
    ...data.attributes,
    content: data.body,
  };

  return schemas.rule.parse(rule);
}
