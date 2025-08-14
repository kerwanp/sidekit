import { defineCommand } from "citty";
import { readConfig, readHeader } from "../../config.js";
import { fetchKitRules, generate } from "../../sidekit.js";
import { intro, log, outro } from "@clack/prompts";

export default defineCommand({
  meta: {
    name: "generate",
    description: "Generate agent files",
  },
  async run() {
    const cwd = process.cwd();

    intro(`sidekit generate`);

    log.step(`read configuration`);
    const config = await readConfig({ cwd });
    const header = await readHeader({ cwd });

    log.success(`fetch kits`);
    const rules = await fetchKitRules(config);

    log.step(`generate guidelines`);
    await generate({ cwd, config, header, rules });

    outro(`done`);
  },
});
