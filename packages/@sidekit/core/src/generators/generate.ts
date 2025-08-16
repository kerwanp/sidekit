import claude from "../agents/claude.js";
import { AgentOptions } from "../agents/define.js";
import { MCPConfig } from "../mcp/types.js";
import { SidekitConfig, SidekitRule } from "../types.js";

export type GenerateOptions = {
  cwd: string;
  agents: SidekitConfig["agents"];
  rules: SidekitRule[];
  mcps: Record<string, MCPConfig>;
};

const agents: Record<SidekitConfig["agents"][number], AgentOptions> = {
  claude,
  opencode: claude,
  copilot: claude,
  cursor: claude,
};

export async function generate(options: GenerateOptions) {
  await Promise.all(
    options.agents.map(async (name) => {
      const agent = agents[name];

      await agent.generateRules({ cwd: options.cwd, rules: options.rules });
      await agent.configureMCPs({ cwd: options.cwd, mcps: options.mcps });
    }),
  );
}
