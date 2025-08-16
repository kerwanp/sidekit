import { defineCommand } from "citty";
import { intro, outro } from "@clack/prompts";
import { loadSidekitConfig } from "@sidekit/core";
import { steps } from "../steps.js";
import { colors } from "../colors.js";

export default defineCommand({
  meta: {
    name: "generate",
    description: "Generate agent files",
  },
  args: {
    cwd: {
      type: "string",
      default: process.cwd(),
      required: false,
    },
  },
  async run({ args }) {
    intro(colors.bgPrimary(` sidekit generate `));

    const config = await loadSidekitConfig({ cwd: args.cwd });

    await steps.generate(args.cwd, config);

    outro(`done`);
  },
});
