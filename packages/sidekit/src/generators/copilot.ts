import { join } from "pathe";
import { SidekitGenerator } from "../types.js";
import { writeFile } from "node:fs/promises";
import { groupRules } from "../rules/group_rules.js";
import { createDir } from "../utils/file.js";

export const copilotGenerator: SidekitGenerator = async ({ cwd, rules }) => {
  const output = [];

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

  await createDir(join(cwd, ".github"));

  await writeFile(
    join(cwd, ".github", "copilot-instructions.md"),
    output.join("\n"),
  );
};
