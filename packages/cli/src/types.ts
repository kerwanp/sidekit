import z from "zod";
import { schemas } from "./schemas.js";

export type SidekickConfig = z.infer<typeof schemas.config>;

export type SidekickRule = {
  id: string;
  meta: z.infer<typeof schemas.ruleMetadata>;
  content: string;
};

export type SidekickGeneratorOptions = {
  cwd: string;
  config: SidekickConfig;
  header: string;
  rules: SidekickRule[];
};

export type SidekickGenerator = (
  options: SidekickGeneratorOptions,
) => Promise<void>;
