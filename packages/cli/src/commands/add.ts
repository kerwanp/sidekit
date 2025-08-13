import { defineCommand } from "citty";
import { intro, log, outro, select } from "@clack/prompts";
import { steps } from "../steps.js";

export default defineCommand({
  meta: {
    name: "sidekick",
    description: "Add a new AI guideline",
  },
  args: {
    name: {
      type: "positional",
      description: "Guidelines kit name (eg. adonisjs)",
      required: true,
    },
  },
  async run({ args }) {
    intro(`sidekick`);

    const registry = new URL("../../../../../registry", import.meta.url);

    const { kit, rules } = await steps.fetchKit(registry.pathname, args.name);

    const selected = await steps.selectRules(rules);

    await steps.addConfigRules(args.name, selected);

    log.step("TEST");

    outro("New guideline added");
  },
});
