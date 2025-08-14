import { test } from "@japa/runner";
import { runCommand } from "citty";
import init from "../../../../src/cli/commands/kit/init.js";
import { silent } from "../../../helpers.js";

test.group("sidekit kit init", (group) => {
  group.each.teardown(async ({ context }) => {
    await context.fs.cleanup();
  });

  test("should initialize kit project", async ({ fs, assert }) => {
    await fs.mkdir("");

    await silent(async () => {
      await runCommand(init, {
        rawArgs: [
          "Example Kit",
          "--description",
          "Kit description",
          "--cwd",
          fs.basePath,
        ],
      });
    });

    await assert.fileExists("sidekit.json");
    await assert.fileContains("sidekit.json", "Example Kit");
    await assert.fileContains("sidekit.json", "Kit description");
  });
});
