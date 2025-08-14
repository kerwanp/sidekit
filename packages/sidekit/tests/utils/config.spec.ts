import { test } from "@japa/runner";
import z from "zod";
import { readConfig, updateConfig } from "../../src/utils/config.js";
import { join } from "pathe";
import { InvalidSchemaException } from "../../src/exceptions/invalid_schema_exception.js";
import { FileException } from "../../src/exceptions/file_exception.js";

const schema = z.object({
  foo: z.string(),
});

test.group("readConfig", (group) => {
  group.each.teardown(async ({ context }) => {
    await context.fs.cleanup();
  });

  test("should return config", async ({ fs, expect }) => {
    await fs.createJson("test.json", {
      foo: "baz",
    });

    await expect(() =>
      readConfig(join(fs.basePath, "test.json"), schema),
    ).resolves.toEqual({
      foo: "baz",
    });
  });

  test("should fail when file does not exist", async ({ fs, expect }) => {
    await expect(() =>
      readConfig(join(fs.basePath, "test.json"), schema),
    ).rejects.toBeInstanceOf(FileException);
  });

  test("should fail with invalid schema", async ({ fs, expect }) => {
    await fs.createJson("test.json", {
      hello: "world",
    });

    await expect(() =>
      readConfig(join(fs.basePath, "test.json"), schema),
    ).rejects.toBeInstanceOf(InvalidSchemaException);
  });
});

test.group("updateConfig", (group) => {
  group.each.teardown(async ({ context }) => {
    await context.fs.cleanup();
  });

  test("should update config", async ({ fs, assert }) => {
    await fs.createJson("test.json", {
      hello: "world",
    });

    await updateConfig(join(fs.basePath, "test.json"), {
      hello: "test",
    });

    assert.fileContains("test.json", "test");
    assert.fileNotContains("test.json", "world");
  });
});
