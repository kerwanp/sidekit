import { readFile } from "node:fs/promises";
import { join } from "pathe";
import { schemas } from "./schemas.js";

export type ReadConfigOptions = {
  cwd: string;
};

export async function readConfig({ cwd }: ReadConfigOptions) {
  const path = join(cwd, ".sidekit", "config.json");
  const content = await readFile(path, "utf8").then((r) => JSON.parse(r));
  const parsed = schemas.config.parse(content);
  return parsed;
}
