import { test } from "@japa/runner";
import { readFile, writeFile } from "../../src/utils/file.js";
import { join } from "pathe";
import { FileException } from "../../src/exceptions/file_exception.js";

test.group("readFile", (group) => {
  group.each.teardown(async ({ context }) => {
    await context.fs.cleanup();
  });

  test("should return file content", async ({ fs, expect }) => {
    await fs.create("test.txt", "Hello world");

    await expect(() => readFile(join(fs.basePath, "test.txt"))).resolves.toBe(
      "Hello world",
    );
  });

  test("should fail when file does not exist", async ({ fs, expect }) => {
    await expect(() =>
      readFile(join(fs.basePath, "test.txt")),
    ).rejects.toBeInstanceOf(FileException);
  });
});

test.group("writeFile", (group) => {
  group.each.teardown(({ context }) => {
    context.fs.cleanup();
  });

  test("should create file", async ({ fs, expect }) => {
    await fs.mkdir(""); // Just for creating tmp folder

    await writeFile(join(fs.basePath, "test.txt"), "Hello world");

    await expect(() => fs.contents("test.txt")).resolves.toBe("Hello world");
  });

  test("should fail when path does not exist", async ({ fs, expect }) => {
    await expect(() =>
      writeFile(join(fs.basePath, "test.txt"), "Hello world"),
    ).rejects.toBeInstanceOf(FileException);
  });
});
