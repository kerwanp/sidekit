import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "pathe";
import { schemas } from "./schemas.js";
import { SidekitKit, SidekitRule } from "./types.js";
import { parseRule } from "./rule.js";
import { format } from "prettier";

export type InitKitOptions = {
  name: string;
  description: string;
  cwd: string;
  file?: string;
};

/**
 * Initialize a new kit project.
 */
export async function initSidekit({ cwd, name, description }: InitKitOptions) {
  await updateKitConfig({
    cwd,
    config: {
      name,
      description,
      rules: [],
    },
  });

  const path = join(cwd, "rules");

  await mkdir(path);
  await createKitRule({ cwd, name: "example" });
}

export type ReadSidekitOptions = {
  cwd: string;
  file?: string;
};

/**
 * Read and parse kit config file.
 */
export async function readKitConfig({ cwd }: ReadSidekitOptions) {
  const path = join(cwd, "sidekit.json");
  const content = await readFile(path, "utf8").then((r) => JSON.parse(r));

  const parsed = schemas.kit.parse(content);
  return parsed;
}

export type UpdateSidekitOptions = {
  cwd: string;
  config: SidekitKit;
};

/**
 * Update kit file.
 */
export async function updateKitConfig({ cwd, config }: UpdateSidekitOptions) {
  const path = join(cwd, "sidekit.json");
  const parsed = schemas.kit.parse(config);
  const content = await format(JSON.stringify(parsed), {
    filepath: path,
  });

  await writeFile(path, content);
}

export type IndexKitOptions = {
  cwd: string;
};

export async function indexKit({ cwd }: IndexKitOptions) {
  const config = await readKitConfig({ cwd });
  const path = join(cwd, "rules");
  const files = await readdir(path);

  const rules: SidekitRule[] = [];

  for (const file of files) {
    const rulePath = join(path, file);
    const content = await readFile(rulePath, "utf8");
    const rule = parseRule(content);
    rules.push(rule);
  }

  config.rules = rules;

  await updateKitConfig({ cwd, config });

  return config;
}

export type CreateKitRuleOptions = {
  cwd: string;
  name: string;
};

export async function createKitRule({ cwd, name }: CreateKitRuleOptions) {
  const path = join(cwd, "rules", `${name}.md`);

  await writeFile(
    path,
    [
      "---",
      `name: ${name}`,
      `description: Example rule`,
      `type: global`,
      "---",
      "## Example rule",
      "",
      "This rule is an example",
    ].join("\n"),
  );

  await indexKit({ cwd });
}
