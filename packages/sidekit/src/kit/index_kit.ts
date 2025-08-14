import { join } from "pathe";
import { loadKitConfig } from "./load_kit_config.js";
import { SidekitRule } from "../types.js";
import { readdir } from "node:fs/promises";
import { readFile } from "../utils/file.js";
import { updateKitConfig } from "./update_kit_config.js";
import { parseRule } from "../rules/parse_rule.js";

export type IndexKitOptions = {
  cwd: string;
};

export async function indexKit({ cwd }: IndexKitOptions) {
  const config = await loadKitConfig({ cwd: cwd });
  const rulesPath = join(cwd, "rules");
  const files = await readdir(rulesPath);

  const rules: SidekitRule[] = [];

  for (const file of files) {
    const rulePath = join(rulesPath, file);
    const content = await readFile(rulePath);
    const rule = parseRule(file.replace(".md", ""), content);
    rules.push(rule);
  }

  config.rules = rules;

  await updateKitConfig({ path: cwd, config });

  return config;
}
