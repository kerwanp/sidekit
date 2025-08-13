import { z } from "zod";
import { schemas } from "./schemas.js";

export type SidekitKit = z.infer<typeof schemas.kit>;
export type SidekitRule = z.infer<typeof schemas.rule>;
export type SidekitConfig = z.infer<typeof schemas.config>;

export type SidekitGeneratorOptions = {
  cwd: string;
  config: SidekitConfig;
  rules: SidekitRule[];
  header: string;
};

export type SidekitGenerator = (
  options: SidekitGeneratorOptions,
) => Promise<void>;
