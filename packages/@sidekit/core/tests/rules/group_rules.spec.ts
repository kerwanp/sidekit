import { test } from "@japa/runner";
import { SidekitRule } from "../../src/types.js";
import { groupRules } from "../../src/rules/group_rules.js";

test.group("groupRules", () => {
  test("should group rules", ({ expect }) => {
    const rules: SidekitRule[] = [
      {
        id: "rule1",
        name: "Global 1",
        content: "Global rule 1",
        type: "rule",
      },
      {
        id: "rule2",
        parent: "group1",
        name: "Name 1",
        description: "Description 1",
        content: "Content 1",
        type: "rule",
      },
      {
        id: "rule3",
        name: "Global 2",
        content: "Global rule 2",
        type: "rule",
      },
      {
        id: "rule4",
        parent: "group1",
        name: "Name 2",
        description: "Description 2",
        content: "Content 2",
        type: "rule",
      },
    ];

    expect(groupRules(rules)).toMatchObject({
      global: [rules[0], rules[2]],
      groups: {
        group1: [rules[1], rules[3]],
      },
    });
  });
});
