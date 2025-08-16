import { SidekitConfig } from "../types.js";
import { updateSidekitConfig } from "./update_sidekit_config.js";
import { join } from "node:path";
import { createDir, writeFile } from "../utils/file.js";
import { stringifyRule } from "../rules/stringify_rule.js";

export type InitSidekit = {
  path: string;
  agents: SidekitConfig["agents"];
};

export async function initSidekit({ path, agents }: InitSidekit) {
  await createDir(join(path, ".sidekit"));

  await updateSidekitConfig({
    cwd: path,
    config: {
      agents,
      rules: ["rules/introduction.md"],
      presets: [],
    },
  });

  await createDir(join(path, ".sidekit", "rules"));

  await writeFile(
    join(path, ".sidekit", "rules", "introduction.md"),
    stringifyRule({
      name: "Introduction",
      description: `
  This file is used as the header and introduction for coding agents.
  You might want to add some introduction about your project and repository.
`,
      type: "rule",
      content: `# Agent guidelines and rules

This file provides guidance to Coding agents when working with code in this repository.
`,
    }),
  );
}
