import { test } from "@japa/runner";
import { parseRule } from "../../src/rules/parse_rule.js";

test.group("parseRule", () => {
  test("should parse rule with all params", ({ expect }) => {
    const input = `---
parent: test
name: Rule name
description: Rule description
type: rule
---
Rule content`;

    expect(parseRule("test", input)).toMatchObject({
      parent: "test",
      name: "Rule name",
      description: "Rule description",
      type: "rule",
      content: "Rule content",
    });
  });
});
