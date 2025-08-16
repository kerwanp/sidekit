import { defineCommand } from "citty";
import { GlobalArgs } from "../../args.js";
import { steps } from "../../steps.js";
import { intro } from "@clack/prompts";
import { colors } from "../../colors.js";

export default defineCommand({
  meta: {
    name: "clear",
    description: "Empty the vector database",
  },
  args: {
    ...GlobalArgs,
  },
  async run({ args }) {
    intro(colors.bgPrimary(` sidekit db clear `));
    steps.database.clear(args.cwd);
  },
});
