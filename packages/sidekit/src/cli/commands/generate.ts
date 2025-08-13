import { defineCommand } from "citty";
import { readConfig, readHeader } from "../../config.js";
import { generate } from "../../sidekit.js";

export default defineCommand({
  meta: {
    name: "generate",
    description: "Generate agent files",
  },
  async run() {
    const cwd = process.cwd();

    const config = await readConfig({ cwd });
    const header = await readHeader({ cwd });

    await generate({ cwd, config, header });
  },
});
