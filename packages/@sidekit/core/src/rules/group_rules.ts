import { SidekitRule } from "../types.js";

export function groupRules(rules: SidekitRule[]) {
  const global: SidekitRule[] = [];
  const groups: Record<string, SidekitRule[]> = {};

  for (const rule of rules) {
    if (!rule.parent) {
      global.push(rule);
      continue;
    }

    const o = groups[rule.parent] ?? [];
    o.push(rule);
    groups[rule.parent] = o;
  }

  return { global, groups };
}
