import { test } from "@japa/runner";
import { initKit } from "../../src/kit/init_kit.js";

test.group("initKit", (group) => {
  group.each.teardown(async ({ context }) => {
    await context.fs.cleanup();
  });

  test("should initialize kit", async ({ assert, fs }) => {
    await fs.mkdir("");

    await initKit({
      path: fs.basePath,
      name: "Name",
      description: "Description",
    });

    await assert.fileContains("sidekit.json", "Name");
    await assert.fileContains("sidekit.json", "Description");
    await assert.fileContains("sidekit.json", `"id": "example`);

    await assert.fileExists("rules/example.md");

    await fs.cleanup();
  });
});
