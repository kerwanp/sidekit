import { join } from "node:path";
import { FileException } from "../../exceptions/file_exception.js";
import { schemas } from "../../schemas.js";
import { resolveModulePath } from "../../utils/modules.js";
import { readConfig } from "../../utils/config.js";

/**
 * Resolves kit from local registry.
 */
export async function resolveLocalKit(id: string) {
  const path = await resolveModulePath(id);
  if (!path) return;

  try {
    const config = await readConfig(join(path, "sidekit.json"), schemas.kit);

    return config;
  } catch (e) {
    if (e instanceof FileException) {
      return;
    }
  }
}
