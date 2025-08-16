import { loadPresetRules } from "../../src/rules/load_preset_rules.js";
import { loadRule } from "../../src/rules/load_rule.js";
import { SidekitRule } from "../../src/types.js";
import { loadDocsRules } from "./load_docs_rules.js";

export type LoadRulesOptions = {
  path: string;
  rules: string[];
  presets: string[];
  docs: string[];
};

export async function loadRules({
  path,
  rules,
  presets,
  docs,
}: LoadRulesOptions) {
  const output: SidekitRule[] = [];

  for (const rule of rules) {
    output.push(await loadRule({ path, id: rule }));
  }

  for (const preset of presets) {
    output.push(...(await loadPresetRules({ path, id: preset })));
  }

  for (const id of docs) {
    output.push(...(await loadDocsRules({ id })));
  }

  return output;
}
