import { test } from "@japa/runner";
import { loadPresetRules } from "../../src/rules/load_preset_rules.js";

test.group("loadRule", (group) => {
  group.each.teardown(async ({ context }) => {
    await context.fs.cleanup();
  });

  test("should load preset rules", async ({ fs, expect }) => {
    const rules = await loadPresetRules({
      id: "adonisjs:recommended",
      path: fs.basePath,
    });

    expect(rules.length).toBeGreaterThan(0);
  });
});
