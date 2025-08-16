import { join } from "pathe";
import { readConfig } from "../utils/config.js";
import { schemas } from "../schemas.js";

export type LoadSidekitConfigOptions = {
  cwd: string;
};

export async function loadSidekitConfig({ cwd }: LoadSidekitConfigOptions) {
  const config = await readConfig(
    join(cwd, ".sidekit", "config.json"),
    schemas.config,
  );

  return config;
}
