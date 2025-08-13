import { readdir, readFile } from "node:fs/promises";
import { join } from "pathe";
import { parseRule } from "./rules.js";
import { schemas } from "./schemas.js";
import { SidekickRule } from "./types.js";

export type FetchRegistryKitOptions = {
  url: string;
  path: string;
};

export async function fetchRegistryKit({ url, path }: FetchRegistryKitOptions) {
  const base = join(url, path);

  const kit = await readKit(base);

  return kit;
}

async function readKit(path: string) {
  const [kit, rules] = await Promise.all([
    readKitJson(path),
    readKitRules(path),
  ]);

  return { kit, rules };
}

export async function readKitRules(base: string) {
  const path = join(base, "rules");
  const files = await readdir(path);
  const rules: SidekickRule[] = [];

  for (const name of files) {
    const rule = await readKitRule(base, name);
    rules.push(rule);
  }

  return rules;
}

async function readKitRule(base: string, rule: string) {
  const path = join(base, "rules", rule);
  const content = await readFile(path, "utf8");
  return parseRule(rule, content);
}

async function readKitJson(path: string) {
  const content = await readFile(join(path, "kit.json"), "utf8").then((r) =>
    JSON.parse(r),
  );

  return schemas.kit.parse(content);
}
