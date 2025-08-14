import { PresetNotFoundException } from "../exceptions/preset_not_found_exception.js";
import { resolveKit } from "../kit/resolve/resolve_kit.js";
import { loadRule } from "./load_rule.js";

export type LoadPresetRules = {
  path: string;
  id: string;
};

export async function loadPresetRules({ path, id }: LoadPresetRules) {
  const [kitId, presetId] = id.split(":");
  const kit = await resolveKit(kitId);

  const preset = kit.presets[presetId];

  if (!preset) {
    throw new PresetNotFoundException(
      id,
      `kit '${kitId}' does not provide this preset`,
    );
  }

  const output = [];

  for (const ruleId of preset) {
    output.push(await loadRule({ path, id: ruleId }));
  }

  return output;
}
