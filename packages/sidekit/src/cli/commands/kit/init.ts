import { defineCommand } from "citty";
import { initSidekit } from "../../../kit.js";
import { intro, log, outro, text } from "@clack/prompts";
import color from "picocolors";

export default defineCommand({
  meta: {
    name: "init",
    description: "Initialize a new Sidekit kit",
  },
  args: {
    cwd: {
      type: "string",
      required: false,
      default: process.cwd(),
    },
    name: {
      type: "positional",
      required: true,
    },
    description: {
      type: "string",
      required: false,
    },
  },
  async run({ args }) {
    intro(color.bgBlackBright(` sidekit kit index `));

    const name =
      args.name ||
      (await text({
        message: "What is the name of your kit?",
      }));

    if (typeof name === "symbol") process.exit();

    let description =
      args.description ??
      (await text({
        message: "Provide a short description",
      }));

    if (typeof description === "symbol") process.exit();

    await initSidekit({ cwd: args.cwd, name, description });

    log.success(`${name} kit has been initialized`);

    outro(`end`);
  },
});
