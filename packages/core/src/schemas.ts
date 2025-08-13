import { z } from "zod";

const rule = z.object({
  name: z.string(),
  description: z.string(),
  type: z.enum(["rule"]),
  content: z.string(),
});

const sidekit = z.object({
  name: z.string(),
  description: z.string(),
  rules: z.array(rule),
});

export const schemas = {
  rule,
  sidekit,
};
