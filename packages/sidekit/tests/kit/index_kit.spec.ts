import { test } from "@japa/runner";
import { indexKit } from "../../src/kit/index_kit.js";
import { FileSystem } from "@japa/file-system";
import { InvalidSchemaException } from "../../src/exceptions/invalid_schema_exception.js";

async function initProject(fs: FileSystem, ruleId: string, rule: string[]) {
  await fs.createJson("sidekit.json", {
    name: "Name",
    description: "Description",
    rules: [],
    presets: {},
  });

  await fs.create(`rules/${ruleId}.md`, rule.join("\n"));
}

test.group("indexKit", (group) => {
  group.each.teardown(async ({ context }) => {
    await context.fs.cleanup();
  });

  test("should index kit rules", async ({ fs, expect }) => {
    await initProject(fs, "example", [
      "---",
      "parent: example",
      "name: Example rule",
      "description: Example rule description",
      "type: rule",
      "---",
      "Demo content",
    ]);

    await indexKit({ cwd: fs.basePath });

    const content = await fs.contentsJson("sidekit.json");

    expect(content.rules).toHaveLength(1);

    expect(content.rules).toMatchObject([
      {
        parent: "example",
        name: "Example rule",
        description: "Example rule description",
        type: "rule",
        content: "Demo content",
      },
    ]);
  });

  test("should fail with invalid rule", async ({ fs, expect }) => {
    await initProject(fs, "example", [
      "---",
      "parent: example",
      "description: Example rule description",
      "type: rule",
      "---",
      "Demo content",
    ]);

    await expect(() => indexKit({ cwd: fs.basePath })).rejects.toBeInstanceOf(
      InvalidSchemaException,
    );
  });
});
