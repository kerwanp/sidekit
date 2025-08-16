import { log, multiselect, select, spinner } from "@clack/prompts";
import { SidekitConfig, SidekitPreset, SidekitRule } from "@sidekit/core/types";
import { resolveKit } from "@sidekit/core/kit";
import { loadRules } from "@sidekit/core/rules";
import { generate } from "@sidekit/core";
import { resolveRegistry } from "@sidekit/core/registry";
import colors from "picocolors";
import { loadDatabase } from "@sidekit/search";
import { join } from "pathe";
import picocolors from "picocolors";

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
  async selectPresets(presets: Record<string, SidekitPreset>) {
    const selected = await multiselect({
      message: "What preset do you want to add?",
      required: false,
      options: Object.entries(presets).map(([id, preset]) => ({
        label: preset.name,
        hint: preset.description,
        value: id,
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
  async generate(cwd: string, config: SidekitConfig) {
    const rules = await loadRules({
      path: cwd,
      rules: config.rules,
      presets: config.presets,
      docs: config.docs,
    });

    await generate({ cwd, agents: config.agents, rules, mcps: config.mcps });

    log.step(colors.green(`Generated ${rules.length} rules ✔`));
    log.step(
      colors.green(
        `Configured ${Object.values(config.mcps).length} MCP servers ✔`,
      ),
    );

    return rules;
  },
  database: {
    clear(cwd: string) {
      const s = spinner();

      s.start("Emptying documentation database");

      const db = loadDatabase({
        filename: join(cwd, ".sidekit", "sidekit.db"),
      });

      s.stop("Empty database");

      db.clear();
    },
    async index(cwd: string, config: SidekitConfig) {
      const s = spinner();

      s.start("Indexing documents");

      const rules = await loadRules({
        path: cwd,
        rules: [],
        presets: [],
        docs: config.docs,
      });

      const docs = rules.filter((rule) => rule.type === "documentation");

      s.stop(picocolors.green(`${docs.length} documents indexed ✔`));
    },
  },
};
