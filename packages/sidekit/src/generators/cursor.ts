import { join } from "pathe";
import { SidekitGenerator } from "../types.js";
import { writeFile } from "node:fs/promises";
import { createDir } from "../utils/file.js";

export const cursorGenerator: SidekitGenerator = async ({ cwd, rules }) => {
  await createDir(join(cwd, ".copilot", "rules"));

  for (const rule of rules) {
    if (!rule.parent) continue; // TODO: We might want to allow global rules in cursor

    const path = join(
      cwd,
      ".copilot",
      "rules",
      `${rule.parent}-${rule.id}.mdc`,
    );

    const content = [
      "---",
      `description: ${rule.name}`,
      `alwaysApply: true`,
      "---",
      rule.content,
    ];

    await writeFile(path, content.join("\n"));
  }
};
