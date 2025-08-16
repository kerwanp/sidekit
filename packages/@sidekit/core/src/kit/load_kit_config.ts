import { join } from "pathe";
import { schemas } from "../schemas.js";
import { readConfig } from "../utils/config.js";

export type ResolveKitOptions = {
  cwd: string;
};

export async function loadKitConfig({ cwd }: ResolveKitOptions) {
  const config = await readConfig(join(cwd, "sidekit.json"), schemas.kit);
  return config;
}
