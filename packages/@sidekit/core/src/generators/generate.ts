import { SidekitGeneratorOptions } from "../types.js";
import { claudeGenerator } from "./claude.js";
import { copilotGenerator } from "./copilot.js";
import { cursorGenerator } from "./cursor.js";
import { opencodeGenerator } from "./opencode.js";

export type GenerateOptions = SidekitGeneratorOptions;

export async function generate(options: GenerateOptions) {
  await Promise.all(
    options.config.agents.map(async (agent) => {
      if (agent === "claude") {
        await claudeGenerator(options);
      }

      if (agent === "opencode") {
        await opencodeGenerator(options);
      }

      if (agent === "copilot") {
        await copilotGenerator(options);
      }

      if (agent === "cursor") {
        await cursorGenerator(options);
      }
    }),
  );
}
