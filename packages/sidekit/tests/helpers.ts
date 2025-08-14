import { FileSystem } from "@japa/file-system";

export const BASE_URL = new URL("./tmp/", import.meta.url);

export async function initEmptyProject(fs: FileSystem) {
  await fs.createJson("package.json", {
    name: "test-pkg",
    version: "0.0.0",
    dependencies: {
      demo: "0.0.0",
    },
  });

  await fs.createJson("node_modules/demo/package.json", {
    name: "demo",
    version: "0.0.0",
  });
}

export async function silent(cb: () => Promise<any>) {
  const originalWrite = process.stdout.write;
  const originalErrorWrite = process.stderr.write;

  // Suppress output
  // @ts-ignore
  process.stdout.write = () => {};
  // @ts-ignore
  process.stderr.write = () => {};

  await cb();

  // Restore
  process.stdout.write = originalWrite;
  process.stderr.write = originalErrorWrite;
}
