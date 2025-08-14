import { multiselect, select, spinner } from "@clack/prompts";
import { SidekitRule } from "../types.js";
import { resolveKit } from "../kit/resolve/resolve_kit.js";
import { loadRules } from "../rules/load_rules.js";
import { generate } from "../generators/generate.js";
import { loadSidekitConfig } from "../sidekit/load_sidekit_config.js";
import { resolveRegistry } from "../registry/resolve_registry.js";

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
        {
          label: "Cursor",
          value: "cursor",
        },
        {
          label: "Copilot",
          value: "copilot",
        },
      ],
    });

    if (typeof agents === "symbol") process.exit();
    return agents;
  },
  async selectKit() {
    const registry = await resolveRegistry();

    const selected = await select({
      message: "What kit do you want to add?",
      options: registry.kits.map((kit) => ({
        label: kit.name,
        description: kit.description,
        value: kit.id,
      })),
    });

    if (typeof selected === "symbol") process.exit();

    return selected;
  },
  async resolveKit(id: string) {
    const s = spinner();
    s.start(`Fetching ${id} kit`);

    const kit = await resolveKit(id);

    s.stop(`Fetched ${id} kit ✔`);

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
    const config = await loadSidekitConfig({ cwd });
    const rules = await loadRules({
      path: cwd,
      rules: config.rules,
      presets: config.presets,
    });

    s.start(`Generating files for ${config.agents.join(", ")}`);
    await generate({ config, cwd, rules });
    s.stop(`Generated files for ${config.agents.join(", ")} ✔`);
  },
};
