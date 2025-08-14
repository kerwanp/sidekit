import { test } from "@japa/runner";
import { runCommand } from "citty";
import index from "../../../../src/cli/commands/kit/index.js";
import { silent } from "../../../helpers.js";
import { initKit } from "../../../../src/kit/init_kit.js";

test.group("sidekit kit index", (group) => {
  group.each.teardown(async ({ context }) => {
    await context.fs.cleanup();
  });

  test("should index kit rules", async ({ fs, expect }) => {
    await fs.mkdir("");

    await initKit({ path: fs.basePath, name: "Example" });

    await fs.remove("rules/example.md");

    await fs.create(
      "rules/test.md",
      [
        "---",
        "parent: test",
        "name: Rule name",
        "description: Rule description",
        "type: rule",
        "---",
        "Rule content",
      ].join("\n"),
    );

    await silent(async () => {
      await runCommand(index, {
        rawArgs: ["--cwd", fs.basePath],
      });
    });

    const content = await fs.contentsJson("sidekit.json");
    expect(content.rules).toHaveLength(1);
    expect(content.rules[0]).toMatchObject({
      id: "test",
      parent: "test",
      name: "Rule name",
      description: "Rule description",
      type: "rule",
      content: "Rule content",
    });
  });
});
