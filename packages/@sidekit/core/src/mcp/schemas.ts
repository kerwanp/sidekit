import z from "zod";

export const MCPConfigSchema = z.object({
  type: z.enum(["stdio"]),
  command: z.string(),
  args: z.array(z.string()),
  env: z.record(z.string(), z.string()),
});
