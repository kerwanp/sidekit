import { fetchKit } from "./registry.js";
import { SidekitConfig, SidekitRule } from "./types.js";

export type GenerateOptions = {
  cwd: string;
  config: SidekitConfig;
};

export async function generate({ cwd, config }: GenerateOptions) {
  const rules = await fetchKitRules(config);

  console.log(rules);
}

// export async function fetchKits(config: SidekitConfig) {
//   const ids = [...new Set(config.rules.map((rule) => rule.split(":")[0]))];
//   return Promise.all(ids.map((id) => fetchKit({ input: id })));
// }

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
