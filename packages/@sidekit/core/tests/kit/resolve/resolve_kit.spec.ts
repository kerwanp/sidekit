import { test } from "@japa/runner";
import { resolveKit } from "../../../src/kit/resolve/resolve_kit.js";
import { KitNotFoundException } from "../../../src/exceptions/kit_not_found_exception.js";

test.group("resolveKit", () => {
  test("should fetch kit", async ({ expect }) => {
    const kit = await resolveKit("example");

    expect(kit).toMatchObject({
      name: "Example",
    });
  });

  test("should return undefined if not found", async ({ expect }) => {
    await expect(() => resolveKit("mlly")).rejects.toBeInstanceOf(
      KitNotFoundException,
    );
  });
});
