import { schemas } from "./schemas.js";
import { SidekitRule } from "./types.js";
import fm from "front-matter";

export function parseRule(id: string, content: string): SidekitRule {
  const data = (fm as any)(content);

  const rule = {
    ...data.attributes,
    id,
    content: data.body,
  };

  return schemas.rule.parse(rule);
}

export function groupRules(rules: SidekitRule[]) {
  const map = new Map<string, SidekitRule[]>();

  for (const rule of rules) {
    const o = map.get(rule.parent) ?? [];
    o.push(rule);
    map.set(rule.parent, o);
  }

  return map;
}
