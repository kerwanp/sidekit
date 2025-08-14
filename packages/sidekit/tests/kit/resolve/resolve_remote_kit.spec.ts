import { test } from "@japa/runner";
import { resolveRemoteKit } from "../../../src/kit/resolve/resolve_remote_kit.js";

test.group("resolveRemoteKit", () => {
  test("should fetch remote kit", async ({ expect }) => {
    const kit = await resolveRemoteKit("adonisjs");

    expect(kit).toMatchObject({
      name: "Test", // TODO: Change once updated
    });
  });

  test("should return undefined if not found", async ({ expect }) => {
    const kit = await resolveRemoteKit("doesnotexist");
    expect(kit).toBeUndefined();
  });
});
