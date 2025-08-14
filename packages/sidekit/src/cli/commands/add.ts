import { intro } from "@clack/prompts";
import { defineCommand } from "citty";
import color from "picocolors";
import { steps } from "../steps.js";
import { addConfigRules } from "../../config.js";

export default defineCommand({
  meta: {
    name: "add",
    description: "Add new rules to your configuration",
  },
  args: {
    name: {
      type: "positional",
      description: "The name of the kit",
      required: true,
    },
    cwd: {
      type: "string",
      required: false,
    },
  },
  async run({ args }) {
    intro(color.bgBlackBright(` sidekit add `));

    const kit = await steps.fetchKit(args.name);
    const rules = await steps.selectRules(kit.rules);

    await addConfigRules({
      cwd: args.cwd,
      rules: rules.map((rule) => `${args.name}:${rule.id}`),
    });

    await steps.generate(args.cwd);
  },
});
