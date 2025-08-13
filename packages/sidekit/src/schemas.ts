import { z } from "zod";

const rule = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(["global", "rule"]),
  content: z.string(),
});

const kit = z.object({
  name: z.string(),
  description: z.string(),
  rules: z.array(rule),
});

const config = z.object({
  agent: z.enum(["claude"]),
  rules: z.array(z.string()),
});

export const schemas = {
  rule,
  kit,
  config,
};
