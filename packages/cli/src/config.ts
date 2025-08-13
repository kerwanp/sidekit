import { schemas } from "./schemas.js";
import { SidekickConfig, SidekickRule } from "./types.js";
import { join } from "pathe";
import { readFile } from "node:fs/promises";
import { readKitRules } from "./registry.js";

export function defineSidekickConfig(config: SidekickConfig): SidekickConfig {
  return config;
}

export type LoadSidekickConfigOptions = {
  cwd: string;
};

export async function readSideKickConfig({ cwd }: LoadSidekickConfigOptions) {
  const path = join(cwd, ".sidekick", "config.json");
  const content = await readFile(path, "utf8").then((r) => JSON.parse(r));

  const parsed = schemas.config.parse(content);

  return parsed;
}

export async function loadSidekickConfig({ cwd }: LoadSidekickConfigOptions) {
  const config = await readSideKickConfig({ cwd });

  for (const [kit, rules] of config.rules) {
    await readKitRules(cwd);
  }
}

export type AddSidekickConfigRuleOptions = {
  cwd: string;
  kit: string;
  rules: SidekickRule[];
};

export async function addSidekickConfigRules({
  cwd,
  kit,
  rules,
}: AddSidekickConfigRuleOptions) {}
