import { defineCommand } from "citty";
import { intro, log } from "@clack/prompts";
import color from "picocolors";
import { indexKit } from "../../../kit/index_kit.js";
import { GlobalArgs } from "../../args.js";

export default defineCommand({
  meta: {
    name: "index",
    description: "Index the kit rules",
  },
  args: {
    ...GlobalArgs,
  },
  async run({ args }) {
    intro(color.bgBlackBright(` sidekit kit index `));

    const config = await indexKit({ cwd: args.cwd });

    log.success(`${config.rules.length} rules indexed`);
  },
});
