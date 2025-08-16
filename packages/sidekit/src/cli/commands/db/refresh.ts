import { defineCommand } from "citty";
import { GlobalArgs } from "../../args.js";
import { loadSidekitConfig } from "@sidekit/core";
import { steps } from "../../steps.js";
import { intro } from "@clack/prompts";
import { colors } from "../../colors.js";

export default defineCommand({
  meta: {
    name: "refresh",
    description: "Refresh vector database",
  },
  args: {
    ...GlobalArgs,
  },
  async run({ args, ...ctx }) {
    intro(colors.bgPrimary(` sidekit db refresh `));

    const config = await loadSidekitConfig({ cwd: args.cwd });

    steps.database.clear(args.cwd);
    await steps.database.index(args.cwd, config);
  },
});
