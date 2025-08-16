import { createMCPServer } from "@sidekit/mcp";
import { defineCommand } from "citty";
import { GlobalArgs } from "../../args.js";
import { join } from "pathe";

export default defineCommand({
  meta: {
    name: "mcp",
    description: "Manage the Sidekit MCP server",
  },
  args: {
    ...GlobalArgs,
  },
  run({ args }) {
    const path = join(args.cwd, ".sidekit", "sidekit.db");
    const server = createMCPServer({ database: path });

    server.start();
  },
});
