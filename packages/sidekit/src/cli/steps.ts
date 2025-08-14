import { multiselect, spinner } from "@clack/prompts";
import { SidekitRule } from "../types.js";
import { fetchKit } from "../registry.js";
import { fetchRules, generate } from "../sidekit.js";
import { readConfig, readHeader } from "../config.js";

export const steps = {
  async fetchKit(name: string) {
    const s = spinner();
    s.start(`Fetching ${name} kit`);

    const kit = await fetchKit({ input: name });

    s.stop(`Fetched ${name} kit ✔`);

    return kit;
  },
  async selectRules(rules: SidekitRule[]) {
    const selected = await multiselect({
      message: "What rules do you want to enable?",
      options: rules.map((rule) => ({
        label: rule.name,
        hint: rule.description,
        value: rule,
      })),
      required: true,
    });

    if (typeof selected === "symbol") process.exit();

    return selected;
  },
  async generate(cwd: string) {
    const s = spinner();
    const config = await readConfig({ cwd });
    const header = await readHeader({ cwd });
    const rules = await fetchRules(config);

    s.start(`Generating files for ${config.agent}`);
    await generate({ config, cwd, header, rules });
    s.stop(`Generated files for ${config.agent} ✔`);
  },
};
