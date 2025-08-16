import { z } from "zod";
import { MCPConfigSchema } from "./mcp/schemas.js";

const rule = z.object({
  parent: z.string().optional(),
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(["rule", "documentation"]),
  content: z.string(),
});

const preset = z.object({
  name: z.string(),
  description: z.string().optional(),
  rules: z.array(z.string()),
});

const kit = z.object({
  $schema: z.string().optional(),
  folders: z.array(z.string()),
  name: z.string(),
  description: z.string().optional(),
  rules: z.array(rule),
  presets: z.record(z.string(), preset),
});

const config = z.object({
  $schema: z.string().optional(),
  agents: z.array(z.enum(["claude", "opencode", "copilot", "cursor"])),
  rules: z.array(z.string()).default([]),
  docs: z.array(z.string()).default([]),
  presets: z.array(z.string()).default([]),
  mcps: z.record(z.string(), MCPConfigSchema).default({}),
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
  kit,
  config,
  registry,
  preset,
};
