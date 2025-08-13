import { defineCommand } from "citty";
import { readConfig } from "../../config.js";
import { generate } from "../../sidekit.js";

export default defineCommand({
  meta: {
    name: "generate",
    description: "Generate agent files",
  },
  async run() {
    const cwd = process.cwd();

    const config = await readConfig({ cwd });
    const kits = await generate({ cwd, config });
  },
});
