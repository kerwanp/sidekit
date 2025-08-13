import z from "zod";

const schemas = {
  kit: z.object({
    name: z.string(),
    description: z.string(),
  }),
  config: z.object({
    agent: z.enum(["opencode", "claude", "crush", "cursor"]),
    rules: z.array(z.string()),
  }),
};

export default schemas;
