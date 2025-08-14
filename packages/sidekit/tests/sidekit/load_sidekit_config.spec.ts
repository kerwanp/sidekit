import { test } from "@japa/runner";
import { loadSidekitConfig } from "../../src/sidekit/load_sidekit_config.js";
import { FileException } from "../../src/exceptions/file_exception.js";

test.group("loadSidekitConfig", (group) => {
  group.each.teardown(async ({ context }) => {
    await context.fs.cleanup();
  });

  test("should load configuration file", async ({ fs, expect }) => {
    await fs.createJson(".sidekit/config.json", {
      agents: ["claude"],
      rules: [],
      presets: [],
    });

    const config = await loadSidekitConfig({ cwd: fs.basePath });

    expect(config).toMatchObject({
      agents: ["claude"],
      rules: [],
      presets: [],
    });
  });

  test("should fail with file not found", async ({ fs, expect }) => {
    await expect(() =>
      loadSidekitConfig({ cwd: fs.basePath }),
    ).rejects.toBeInstanceOf(FileException);
  });
});
