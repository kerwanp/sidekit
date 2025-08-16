import { test } from "@japa/runner";
import { initSidekit } from "../../src/sidekit/init_sidekit.js";

test.group("initSidekit", (group) => {
  group.each.teardown(async ({ context }) => {
    await context.fs.cleanup();
  });

  test("should initialize sidekit", async ({ fs, assert }) => {
    await fs.mkdir("");

    await initSidekit({ path: fs.basePath, agents: ["claude", "opencode"] });

    await assert.fileExists(".sidekit/config.json");
    await assert.fileContains(".sidekit/config.json", "$schema");
    await assert.fileContains(
      ".sidekit/config.json",
      `"agents": ["claude", "opencode"]`,
    );
  });
});
