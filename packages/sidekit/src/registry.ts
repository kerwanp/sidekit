import { schemas } from "./schemas.js";

export type FetchKit = {
  input: string;
};

export async function fetchKit({ input }: FetchKit) {
  const kit = await fetchKitFromGlobalRegistry({ id: input });

  return kit;
}

export type ReadFromGlobalRegistryKitOptions = {
  id: string;
};

export async function fetchKitFromGlobalRegistry({
  id,
}: ReadFromGlobalRegistryKitOptions) {
  const url = `https://raw.githubusercontent.com/kerwanp/sidekit/refs/heads/main/registry/${id}/sidekit.json`;
  const response = await fetch(url);

  const content = await response.text();

  return schemas.kit.parse(JSON.parse(content));
}
