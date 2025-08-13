import { join } from "pathe";
import { SidekickGenerator } from "../types.js";
import { writeFile } from "node:fs/promises";

export const generateClaude: SidekickGenerator = async ({
  cwd,
  rules,
  header,
}) => {
  const path = join(cwd, "CLAUDE.md");

  const content = [header];

  for (const rule of rules) {
    content.push(rule.content);
  }

  await writeFile(path, content.join("\n"));
};
