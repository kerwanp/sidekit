import { join } from "pathe";
import { loadKitConfig } from "./load_kit_config.js";
import { readdir } from "node:fs/promises";
import { updateKitConfig } from "./update_kit_config.js";
import { readMarkdown } from "../utils/markdown.js";
import { schemas } from "../schemas.js";
import z from "zod";

export type IndexKitOptions = {
  cwd: string;
};

export async function indexKit({ cwd }: IndexKitOptions) {
  const config = await loadKitConfig({ cwd: cwd });

  const rules = await readFolder(join(cwd, "rules"), schemas.rule);
  const docs = await readFolder(join(cwd, "docs"), schemas.doc);

  config.rules = rules;
  config.docs = docs;

  await updateKitConfig({ path: cwd, config });

  return config;
}

async function readFolder<T extends z.ZodType>(path: string, schema: T) {
  const files = await readdir(path);

  const rules: z.infer<T>[] = [];

  for (const file of files) {
    const rulePath = join(path, file);
    const rule = await readMarkdown(rulePath, schema);
    rules.push(rule);
  }

  return rules;
}
