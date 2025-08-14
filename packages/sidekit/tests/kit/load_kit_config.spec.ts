import { test } from "@japa/runner";
import { fileURLToPath } from "mlly";
import { FileException } from "../../src/exceptions/file_exception.js";
import { BASE_URL } from "../helpers.js";
import { InvalidSchemaException } from "../../src/exceptions/invalid_schema_exception.js";
import { loadKitConfig } from "../../src/kit/load_kit_config.js";

test.group("loadKitConfig", (group) => {
  group.each.teardown(async ({ context }) => {
    await context.fs.cleanup();
  });

  test("should resolve configuration", async ({ fs, expect }) => {
    await fs.createJson("sidekit.json", {
      name: "Name",
      description: "Description",
      rules: [],
      presets: {},
    });

    const config = await loadKitConfig({ cwd: fileURLToPath(BASE_URL) });

    expect(config.name).toBe("Name");
    expect(config.description).toBe("Description");
  });

  test("should fail with invalid schema", async ({ fs, expect }) => {
    await fs.createJson("sidekit.json", {
      invalid: "Schema",
    });

    await expect(() =>
      loadKitConfig({ cwd: fileURLToPath(BASE_URL) }),
    ).rejects.toBeInstanceOf(InvalidSchemaException);
  });

  test("should fail with no sidekit.json", async ({ expect }) => {
    await expect(() =>
      loadKitConfig({ cwd: fileURLToPath(BASE_URL) }),
    ).rejects.toBeInstanceOf(FileException);
  });
});
