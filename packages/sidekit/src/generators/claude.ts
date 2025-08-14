import { join } from "pathe";
import { SidekitGenerator } from "../types.js";
import { writeFile } from "node:fs/promises";
import { groupRules } from "../rule.js";

export const claudeGenerator: SidekitGenerator = async ({
  cwd,
  rules,
  header,
}) => {
  const content = [header];
  const path = join(cwd, `CLAUDE.md`);

  const groups = groupRules(rules);

  for (const [group, r] of groups.entries()) {
    content.push(`=== ${group} guidelines ===\n`);
    content.push(...r.map((rule) => rule.content));
  }

  await writeFile(path, content.join("\n"));
};
