import { test } from "@japa/runner";
import { normalizeRuleId } from "../../src/rules/normalize_rule_id.js";

test.group("normalizeRule", () => {
  test("should normalize local rule id", ({ expect }) => {
    const normalized = normalizeRuleId("rules/introduction.md");

    expect(normalized).toEqual({
      source: "local",
      path: "rules/introduction.md",
    });
  });

  test("should normalize remote rule id", ({ expect }) => {
    const normalized = normalizeRuleId("sidekit:documentation");

    expect(normalized).toEqual({
      source: "remote",
      kitId: "sidekit",
      ruleId: "documentation",
    });
  });
});
