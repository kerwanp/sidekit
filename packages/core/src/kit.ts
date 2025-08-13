import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "pathe";
import { schemas } from "./schemas.js";
import { Sidekit, SidekitRule } from "./types.js";
import { parseRule } from "./rule.js";

export type InitSidekitOptions = {
  name: string;
  description: string;
  cwd: string;
  file?: string;
};

/**
 * Initialize a new sidekit project.
 */
export async function initSidekit({
  cwd,
  name,
  description,
}: InitSidekitOptions) {
  const path = join(cwd, "sidekit.json");

  await writeFile(
    path,
    JSON.stringify({
      name,
      description,
    }),
  );
}

export type ReadSidekitOptions = {
  cwd: string;
  file?: string;
};

/**
 * Read and parse sidekit.json file.
 */
export async function readSidekit({ cwd }: ReadSidekitOptions) {
  const path = join(cwd, "sidekit.json");
  const content = await readFile(path, "utf8").then((r) => JSON.parse(r));

  const parsed = schemas.sidekit.parse(content);
  return parsed;
}

export type UpdateSidekitOptions = {
  cwd: string;
  config: Sidekit;
};

/**
 * Update sidekit.json file.
 */
export async function updateSidekit({ cwd, config }: UpdateSidekitOptions) {
  const path = join(cwd, "sidekit.json");
  const parsed = schemas.sidekit.parse(config);

  await writeFile(path, JSON.stringify(parsed));
}

export type IndexSidekit = {
  cwd: string;
};

export async function indexSidekit({ cwd }: InitSidekitOptions) {
  const config = await readSidekit({ cwd });
  const path = join(cwd, "rules");
  const files = await readdir(path);

  const rules: SidekitRule[] = [];

  for (const file of files) {
    const rulePath = join(path, file);
    const content = await readFile(rulePath, "utf8").then((r) => JSON.parse(r));
    const rule = parseRule(content);
    rules.push(rule);
  }

  config.rules = rules;

  await updateSidekit({ cwd, config });
}
