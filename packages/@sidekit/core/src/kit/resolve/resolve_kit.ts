import { KitNotFoundException } from "../../exceptions/kit_not_found_exception.js";
import { KitCache } from "../cache.js";
import { resolveLocalKit } from "./resolve_local_kit.js";
import { resolveRemoteKit } from "./resolve_remote_kit.js";

/**
 * Resolves kit from local and remote registries.
 */
export async function resolveKit(id: string) {
  let kit = KitCache.get(id);

  if (!kit) {
    kit = await resolveLocalKit(id);
  }

  if (!kit) {
    kit = await resolveRemoteKit(id);
  }

  if (!kit) {
    throw new KitNotFoundException(id);
  }

  KitCache.set(id, kit);

  return kit;
}
