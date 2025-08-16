import { test } from "@japa/runner";
import { resolveLocalKit } from "../../../src/kit/resolve/resolve_local_kit.js";

test.group("resolveLocalKit", () => {
  test("should fetch local kit", async ({ expect }) => {
    const kit = await resolveLocalKit("example");

    expect(kit).toMatchObject({
      name: "Example",
    });
  });

  test("should return undefined if not found", async ({ expect }) => {
    const kit = await resolveLocalKit("mlly");
    expect(kit).toBeUndefined();
  });
});
