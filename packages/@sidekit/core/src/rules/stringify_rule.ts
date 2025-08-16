import { SidekitRule } from "../types.js";

export function stringifyRule(rule: Omit<SidekitRule, "id">) {
  const output = [];

  output.push("---");

  if (rule.parent) output.push(`parent: ${rule.parent}`);

  output.push(`name: ${rule.name}`);

  if (rule.description) output.push(`description: ${rule.description}`);

  output.push(`type: ${rule.type}`);

  output.push(`---`);

  output.push(rule.content);

  return output.join("\n");
}
