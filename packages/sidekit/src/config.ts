import { readFile, writeFile } from "node:fs/promises";
import { join } from "pathe";
import { schemas } from "./schemas.js";
import { SidekitConfig } from "./types.js";
import { format } from "prettier";

export type ReadConfigOptions = {
  cwd: string;
};

export async function readConfig({ cwd }: ReadConfigOptions) {
  const path = join(cwd, ".sidekit", "config.json");
  const content = await readFile(path, "utf8").then((r) => JSON.parse(r));
  const parsed = schemas.config.parse(content);
  return parsed;
}

export type UpdateConfigOptions = {
  cwd: string;
  config: SidekitConfig;
};

export async function updateConfig({ cwd, config }: UpdateConfigOptions) {
  const path = join(cwd, ".sidekit", "config.json");

  await writeFile(
    path,
    await format(
      JSON.stringify({
        $schema:
          "https://github.com/kerwanp/sidekit/blob/main/schemas/config.json",
        ...config,
      }),
      {
        filepath: path,
      },
    ),
  );
}

export type AddConfigRulesOptions = {
  cwd: string;
  rules: string[];
};

export async function addConfigRules({ cwd, rules }: AddConfigRulesOptions) {
  const config = await readConfig({ cwd });

  config.rules = [...new Set([...config.rules, ...rules])];

  await updateConfig({ cwd, config });
}
