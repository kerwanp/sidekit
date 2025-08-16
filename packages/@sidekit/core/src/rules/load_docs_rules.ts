import { resolveKit } from "../kit/resolve/resolve_kit.js";

export type LoadDocsRules = {
  id: string;
};

export async function loadDocsRules({ id }: LoadDocsRules) {
  const kit = await resolveKit(id);
  return kit.rules.filter((rule) => rule.type === "documentation");
}
