import z from "zod";
import { MCPConfigSchema } from "./schemas.js";

export type MCPConfig = z.infer<typeof MCPConfigSchema>;
