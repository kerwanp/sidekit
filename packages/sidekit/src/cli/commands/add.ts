import { intro } from "@clack/prompts";
import { defineCommand } from "citty";
import color from "picocolors";
import { steps } from "../steps.js";
import { updateSidekitConfig, loadSidekitConfig } from "@sidekit/core";

export default defineCommand({
  meta: {
    name: "add",
    description: "Add new rules to your configuration",
  },
  args: {
    name: {
      type: "positional",
      description: "The name of the kit",
      required: false,
    },
    cwd: {
      type: "string",
      required: false,
    },
  },
  async run({ args }) {
    intro(color.bgBlackBright(` sidekit add `));

    const config = await loadSidekitConfig({ cwd: args.cwd });

    const name = args.name ?? (await steps.selectKit());

    const kit = await steps.resolveKit(name);
    const presets = await steps.selectPresets(kit.presets);
    const rules = await steps.selectRules(kit.rules);

    config.rules.push(...rules.map((rule) => `${name}:${rule.id}`));
    config.presets.push(...presets.map((preset) => `${name}:${preset}`));

    await updateSidekitConfig({
      cwd: args.cwd,
      config,
    });

    await steps.generate(args.cwd, config);
  },
});
