import z from "zod";

export const schemas = {
  agent: z.enum(["claude", "opencode", "copilot"]),
  kit: z.object({
    name: z.string(),
    description: z.string(),
  }),
  ruleMetadata: z.object({
    name: z.string(),
    description: z.string(),
    type: z.enum(["rule"]),
  }),
  config: z.object({
    rules: z.map(z.string(), z.array(z.string())),
  }),
};
