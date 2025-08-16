import { test } from "@japa/runner";
import { stringifyRule } from "../../src/rules/stringify_rule.js";

test.group("stringifyRule", () => {
  test("should stringify rule with all params", ({ expect }) => {
    const expected = `---
parent: test
name: Rule name
description: Rule description
type: rule
---
Rule content`;

    expect(
      stringifyRule({
        parent: "test",
        name: "Rule name",
        description: "Rule description",
        type: "rule",
        content: "Rule content",
      }),
    ).toBe(expected);
  });
});
