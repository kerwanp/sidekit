import { test } from "@japa/runner";
import { resolveModulePath } from "../../src/utils/modules.js";

test.group("resolveModulePath", () => {
  test("should resolve module path", async ({ fs, expect }) => {
    const path = await resolveModulePath("example");
    expect(path).toContain("example");
    await fs.cleanup();
  });

  test("should return undefined when module not found", async ({ expect }) => {
    const path = await resolveModulePath("doesnotexist");
    expect(path).toBeUndefined();
  });
});
