import { join } from "pathe";
import { SidekitGenerator } from "../types.js";
import { writeFile } from "node:fs/promises";

export const claudeGenerator: SidekitGenerator = async ({
  cwd,
  rules,
  header,
}) => {
  const content = [header, ...rules.map((rule) => rule.content)];
  const path = join(cwd, `CLAUDE.md`);

  await writeFile(path, content.join("\n"));
};
