export type NormalizedRule =
  | {
      source: "remote";
      kitId: string;
      ruleId: string;
    }
  | {
      source: "local";
      path: string;
    };

export function normalizeRuleId(id: string): NormalizedRule {
  if (id.includes(":")) {
    const [kitId, ruleId] = id.split(":");
    return {
      source: "remote",
      kitId,
      ruleId,
    };
  }

  return {
    source: "local",
    path: id,
  };
}
