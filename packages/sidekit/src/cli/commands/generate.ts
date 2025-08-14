import { defineCommand } from "citty";
import { intro, outro } from "@clack/prompts";
import { steps } from "../steps.js";
import color from "picocolors";

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
    intro(color.bgBlackBright(` sidekit generate `));

    await steps.generate(args.cwd);

    outro(`done`);
  },
});
