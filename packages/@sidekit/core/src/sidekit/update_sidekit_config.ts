import { join } from "pathe";
import { SidekitConfig } from "../types.js";
import { updateConfig } from "../utils/config.js";

export type UpdateSidekitConfig = {
  cwd: string;
  config: SidekitConfig;
};

export async function updateSidekitConfig({
  cwd,
  config,
}: UpdateSidekitConfig) {
  // Dedupe rules and presets
  config.rules = [...new Set(config.rules)];
  config.presets = [...new Set(config.presets)];

  await updateConfig(join(cwd, ".sidekit", "config.json"), {
    $schema:
      "https://raw.githubusercontent.com/kerwanp/sidekit/refs/heads/main/schemas/config.json",
    ...config,
  });
}
