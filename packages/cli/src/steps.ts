import { log, multiselect, spinner } from "@clack/prompts";
import { fetchRegistryKit } from "./registry.js";
import { SidekickRule } from "./types.js";
import { addSidekickConfigRules, loadSidekickConfig } from "./config.js";
import { generateClaude } from "./generator/claude.js";

export async function fetchKitStep(registry: string, name: string) {
  const s = spinner();

  s.start(`Fetching kit ${name}`);

  const kit = await fetchRegistryKit({
    url: registry,
    path: name,
  });

  s.stop(`Fetched kit ${name}`);

  return kit;
}

export const steps = {
  async fetchKit(registry: string, name: string) {
    const s = spinner();

    s.start(`Fetching kit ${name}`);

    const kit = await fetchRegistryKit({
      url: registry,
      path: name,
    });

    s.stop(`Fetched kit ${name}`);

    return kit;
  },
  async selectRules(rules: SidekickRule[]) {
    const result = await multiselect({
      message: "What rules do you want to add?",
      options: rules.map((rule) => ({
        label: rule.meta.name,
        value: rule,
        hint: rule.meta.description,
      })),
    });

    if (typeof result === "symbol") {
      process.exit(0);
    }

    return result;
  },
  async addConfigRules(kit: string, rules: SidekickRule[]) {
    log.step(`update configuration file`);
    await addSidekickConfigRules({ cwd: process.cwd(), kit, rules });
  },
  async generate(cwd: string) {
    const config = await loadSidekickConfig({ cwd });
  },
};
