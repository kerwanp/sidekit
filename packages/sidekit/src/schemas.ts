import { z } from "zod";

const rule = z.object({
  name: z.string(),
  description: z.string(),
  type: z.enum(["global"]),
  content: z.string(),
});

const kit = z.object({
  name: z.string(),
  description: z.string(),
  rules: z.array(rule),
});

export const schemas = {
  rule,
  kit,
};
