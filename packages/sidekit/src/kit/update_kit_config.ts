import { join } from "node:path";
import { SidekitKit } from "../types.js";
import { updateConfig } from "../utils/config.js";

export type UpdateKitOptions = {
  path: string;
  config: SidekitKit;
};

/**
 * Updates Sidekit kit configuration file.
 */
export async function updateKitConfig({ path, config }: UpdateKitOptions) {
  await updateConfig(join(path, "sidekit.json"), {
    $schema:
      "https://raw.githubusercontent.com/kerwanp/sidekit/refs/heads/main/schemas/kit.json",
    ...config,
  });
}
