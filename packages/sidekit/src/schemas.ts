import { z } from "zod";

const rule = z.object({
  parent: z.string().optional(),
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(["rule"]),
  content: z.string(),
});

const kit = z.object({
  name: z.string(),
  description: z.string(),
  rules: z.array(rule),
  presets: z.record(z.string(), z.array(z.string())),
});

const config = z.object({
  agent: z.enum(["claude", "opencode"]),
  rules: z.array(z.string()),
  presets: z.array(z.string()),
});

export const schemas = {
  rule,
  kit,
  config,
};
