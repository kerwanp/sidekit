import { loadPresetRules } from "../../src/rules/load_preset_rules.js";
import { loadRule } from "../../src/rules/load_rule.js";
import { SidekitRule } from "../../src/types.js";

export type LoadRulesOptions = {
  path: string;
  rules: string[];
  presets: string[];
};

export async function loadRules({ path, rules, presets }: LoadRulesOptions) {
  const output: SidekitRule[] = [];

  for (const rule of rules) {
    output.push(await loadRule({ path, id: rule }));
  }

  for (const preset of presets) {
    output.push(...(await loadPresetRules({ path, id: preset })));
  }

  return output;
}
