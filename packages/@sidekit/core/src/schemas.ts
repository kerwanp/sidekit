import { z } from "zod";

const rule = z.object({
  parent: z.string().optional(),
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.literal("rule"),
  content: z.string(),
});

const doc = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(["examples"]),
  content: z.string(),
});

const kit = z.object({
  $schema: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  rules: z.array(rule),
  docs: z.array(doc),
  presets: z.record(z.string(), z.array(z.string())),
});

const config = z.object({
  $schema: z.string().optional(),
  agents: z.array(z.enum(["claude", "opencode", "copilot", "cursor"])),
  rules: z.array(z.string()),
  presets: z.array(z.string()),
});

const registry = z.object({
  $schema: z.string().optional(),
  kits: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
    }),
  ),
});

export const schemas = {
  rule,
  doc,
  kit,
  config,
  registry,
};
