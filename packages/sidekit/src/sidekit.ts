import { join } from "pathe";
import { claudeGenerator } from "./generators/claude.js";
import { opencodeGenerator } from "./generators/opencode.js";
import { fetchKit } from "./registry.js";
import {
  SidekitConfig,
  SidekitGeneratorOptions,
  SidekitKit,
  SidekitRule,
} from "./types.js";
import { readFile } from "node:fs/promises";
import { parseRule } from "./rule.js";

export async function generate(options: SidekitGeneratorOptions) {
  if (options.config.agent === "claude") {
    await claudeGenerator(options);
  }

  if (options.config.agent === "opencode") {
    await opencodeGenerator(options);
  }
}

export type FetchRulesOptions = {
  cwd: string;
  config: SidekitConfig;
};

export async function fetchRules({ cwd, config }: FetchRulesOptions) {
  const output: SidekitRule[] = [];
  const data = normalizeRules(config);

  const kits = new Map<string, SidekitKit>();

  for (const rule of data) {
    if (rule.source === "registry") {
      let kit = kits.get(rule.kit);
      if (!kit) {
        kit = await fetchKit({ input: rule.kit });
        kits.set(rule.kit, kit);
      }

      output.push(kit.rules.find((r) => r.id === rule.name)!); // TODO: Maybe handle this
    }

    if (rule.source === "local") {
      const path = join(cwd, ".sidekit", rule.path);
      const content = await readFile(path, "utf8");
      const r = parseRule(rule.path, content);

      output.push(r);
    }
  }

  return output;
}

type NormalizedRule =
  | {
      source: "registry";
      kit: string;
      name: string;
    }
  | { source: "local"; path: string };

export function normalizeRules(config: SidekitConfig) {
  const output: NormalizedRule[] = [];

  for (const rule of config.rules) {
    if (rule.includes(":")) {
      const [kit, name] = rule.split(":");
      output.push({
        source: "registry",
        kit,
        name,
      });
      continue;
    }

    output.push({
      source: "local",
      path: rule,
    });
  }

  return output;
}
