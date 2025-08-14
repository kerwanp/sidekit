import { multiselect, spinner } from "@clack/prompts";
import { SidekitRule } from "../types.js";
import { fetchKit } from "../registry.js";
import { fetchRules, generate } from "../sidekit.js";
import { readConfig } from "../config.js";

export const steps = {
  async selectAgents() {
    const agents = await multiselect({
      message: "What coding agents do you use?",
      options: [
        {
          label: "Opencode",
          value: "opencode",
        },
        {
          label: "Claude code",
          value: "claude",
        },
      ],
    });

    if (typeof agents === "symbol") process.exit();
    return agents;
  },
  async fetchKit(name: string) {
    const s = spinner();
    s.start(`Fetching ${name} kit`);

    const kit = await fetchKit({ input: name });

    s.stop(`Fetched ${name} kit ✔`);

    return kit;
  },
  async selectPresets(presets: Record<string, string[]>) {
    const selected = await multiselect({
      message: "What preset do you want to add?",
      required: false,
      options: Object.entries(presets).map(([name, rules]) => ({
        label: name,
        hint: rules.join(", "),
        value: name,
      })),
    });

    if (typeof selected === "symbol") process.exit();

    return selected;
  },
  async selectRules(rules: SidekitRule[]) {
    const selected = await multiselect({
      message: "What rules do you want to add?",
      required: false,
      options: rules.map((rule) => ({
        label: rule.name,
        hint: rule.description,
        value: rule,
      })),
    });

    if (typeof selected === "symbol") process.exit();

    return selected;
  },
  async generate(cwd: string) {
    const s = spinner();
    const config = await readConfig({ cwd });
    const rules = await fetchRules({ cwd, config });

    s.start(`Generating files for ${config.agents.join(", ")}`);
    await generate({ config, cwd, rules });
    s.stop(`Generated files for ${config.agents.join(", ")} ✔`);
  },
};
