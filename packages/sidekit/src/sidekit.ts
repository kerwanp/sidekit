import { claudeGenerator } from "./generators/claude.js";
import { opencodeGenerator } from "./generators/opencode.js";
import { fetchKit } from "./registry.js";
import {
  SidekitConfig,
  SidekitGeneratorOptions,
  SidekitRule,
} from "./types.js";

export async function generate(options: SidekitGeneratorOptions) {
  if (options.config.agent === "claude") {
    await claudeGenerator(options);
  }

  if (options.config.agent === "opencode") {
    await opencodeGenerator(options);
  }
}

export async function fetchKitRules(config: SidekitConfig) {
  const output: SidekitRule[] = [];
  const data = config.rules.reduce(
    (acc, b) => {
      const [kit, rule] = b.split(":");
      acc[kit] = [...(acc[kit] ?? []), rule];
      return acc;
    },
    {} as Record<string, string[]>,
  );

  for (const [kitId, ruleIds] of Object.entries(data)) {
    const kit = await fetchKit({ input: kitId });
    const rules = kit.rules.filter((rule) => ruleIds.includes(rule.id));
    output.push(...rules);
  }

  return output;
}
