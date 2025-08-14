import z from "zod";
import { FetchException } from "../../exceptions/fetch_exception.js";
import { InvalidSchemaException } from "../../exceptions/invalid_schema_exception.js";
import { schemas } from "../../schemas.js";

/**
 * Resolves kit from remote registry.
 */
export async function resolveRemoteKit(id: string) {
  const url = new URL(
    `https://raw.githubusercontent.com/kerwanp/sidekit/refs/heads/main/registry/${id}/sidekit.json`,
  );

  const response = await fetch(url);

  if (response.status === 404) return;

  if (response.status !== 200) {
    throw new FetchException(); // TODO: Better error
  }

  const text = await response.text();

  try {
    const parsed = schemas.kit.parse(JSON.parse(text));
    return parsed;
  } catch (e) {
    if (e instanceof z.ZodError) {
      throw new InvalidSchemaException(e, "remote sidekit.json");
    }
  }
}
