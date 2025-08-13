import { defineCommand } from "citty";
import { indexKit } from "../../../kit.js";
import { intro, log, outro } from "@clack/prompts";
import color from "picocolors";

export default defineCommand({
  meta: {
    name: "index",
    description: "Index the kit rules",
  },
  async run() {
    intro(color.inverse(" sidekit kit index "));

    const config = await indexKit({ cwd: process.cwd() });

    log.success(`${config.rules.length} rules indexed`);

    outro(color.inverse(" end "));
  },
});
