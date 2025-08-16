import { test } from "@japa/runner";
import { loadRules } from "../../src/rules/load_rules.js";

test.group("loadRules", (group) => {
  group.each.teardown(async ({ context }) => {
    await context.fs.cleanup();
  });

  test("should load rules and presets", async ({ fs, expect }) => {
    const rule = await loadRules({
      path: fs.basePath,
      rules: ["adonisjs:structure"],
      presets: ["adonisjs:recommended"],
    });

    expect(rule).toBeDefined();
  });
});
