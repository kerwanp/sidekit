import { PresetConfig } from "../preset/define.js";

export interface KitConfig {
  name: string;
  description: string;

  presets: Record<string, PresetConfig>;
}

export function defineKit<T extends KitConfig>(config: T): T {
  return config;
}
