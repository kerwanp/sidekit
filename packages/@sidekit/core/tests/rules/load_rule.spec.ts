import { test } from "@japa/runner";
import { loadRule } from "../../src/rules/load_rule.js";
import { stringifyRule } from "../../src/rules/stringify_rule.js";
import { RuleNotFoundException } from "../../src/exceptions/rule_not_found_exception.js";

test.group("loadRule", (group) => {
  group.each.teardown(async ({ context }) => {
    await context.fs.cleanup();
  });

  test("should load remote registry rule", async ({ fs, expect }) => {
    const rule = await loadRule({
      id: "adonisjs:structure",
      path: fs.basePath,
    });

    expect(rule).toBeDefined();
  });

  test("should load local rule", async ({ fs, expect }) => {
    await fs.create(
      ".sidekit/rules/test.md",
      stringifyRule({
        name: "Rule name",
        description: "Rule description",
        type: "rule",
        content: "Rule content",
      }),
    );

    const rule = await loadRule({
      id: "rules/test.md",
      path: fs.basePath,
    });

    expect(rule).toBeDefined();
  });

  test("should fail loading non existing remote rule", async ({
    fs,
    expect,
  }) => {
    await expect(() =>
      loadRule({
        id: "sidekit:nonexistingrule",
        path: fs.basePath,
      }),
    ).rejects.toBeInstanceOf(RuleNotFoundException);
  });

  test("should fail loading non existing local rule", async ({
    fs,
    expect,
  }) => {
    await expect(() =>
      loadRule({
        id: "rules/nonexistingrule.md",
        path: fs.basePath,
      }),
    ).rejects.toBeInstanceOf(RuleNotFoundException);
  });
});
