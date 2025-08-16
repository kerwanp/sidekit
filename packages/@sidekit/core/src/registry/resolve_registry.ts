import { FetchException } from "../exceptions/fetch_exception.js";
import { schemas } from "../schemas.js";

export async function resolveRegistry() {
  const response = await fetch(
    "https://raw.githubusercontent.com/kerwanp/sidekit/refs/heads/main/registry/registry.json",
  );

  if (response.status !== 200) throw new FetchException();

  const text = await response.text();
  return schemas.registry.parse(JSON.parse(text));
}
