import { join } from "pathe";
import { updateConfig } from "../utils/config.js";
import { defineAgent } from "./define.js";
import { groupRules } from "../rules/group_rules.js";
import { writeFile } from "../utils/file.js";

export default defineAgent({
  name: "Claude",
  async generateRules({ cwd, rules }) {
    const output = [];
    const path = join(cwd, `CLAUDE.md`);

    const { global, groups } = groupRules(rules);

    for (const rule of global) {
      output.push(rule.content);
    }

    for (const [group, rule] of Object.entries(groups)) {
      if (group) {
        output.push(`=== ${group} guidelines ===\n`);
      }
      output.push(...rule.map(({ content }) => content));
    }

    await writeFile(path, output.join("\n"));
  },
  async configureMCPs({ cwd, mcps }) {
    const path = join(cwd, ".mcp.json");
    await updateConfig(path, {
      mcpServers: mcps,
    });
  },
});
