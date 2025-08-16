import { test } from "@japa/runner";
import { updateSidekitConfig } from "../../src/sidekit/update_sidekit_config.js";

test.group("updateSidekitConfig", (group) => {
  group.each.teardown(async ({ context }) => {
    await context.fs.cleanup();
  });

  test("should update config file", async ({ fs, assert }) => {
    await fs.createJson(".sidekit/config.json", {});

    await updateSidekitConfig({
      cwd: fs.basePath,
      config: {
        agents: ["claude"],
        presets: [],
        rules: [],
      },
    });

    assert.fileContains(".sidekit/config.json", "$schema");
    assert.fileContains(".sidekit/config.json", "claude");
  });
});
