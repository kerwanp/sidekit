import { MCPConfig } from "../mcp/types.js";
import { SidekitRule } from "../types.js";

export type GenerateRulesOptions = {
  cwd: string;
  rules: SidekitRule[];
};

export type ConfigureMCPsOptions = {
  cwd: string;
  mcps: Record<string, MCPConfig>;
};

export type AgentOptions = {
  name: string;
  generateRules(options: GenerateRulesOptions): Promise<void>;
  configureMCPs(options: ConfigureMCPsOptions): Promise<void>;
};

export function defineAgent(options: AgentOptions): AgentOptions {
  return options;
}
