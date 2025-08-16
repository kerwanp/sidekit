import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import pkg from "../package.json" with { type: "json" };
import { z } from "zod";
import { loadDatabase } from "@sidekit/search";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

export type ServerOptions = {
  database: string;
};

export function createMCPServer({ database }: ServerOptions) {
  const db = loadDatabase({ filename: database });

  const server = new McpServer({
    name: "sidekit",
    version: pkg.version,
  });

  server.registerResource(
    "documentation",
    new ResourceTemplate("sidekit://documentation/{id}", {
      list: undefined,
    }),
    {
      title: "Documentation file",
      description: "Package or library documentation",
      mimeType: "text/markdown",
    },
    async (uri, { id }) => {
      const ids = [id].flat();
      const results = await Promise.all(ids.map((i) => db.retrieve(i)));

      return {
        contents: results.filter(Boolean).map((item) => ({
          uri: uri.href,
          text: item!.content,
        })),
      };
    },
  );

  server.registerTool(
    "search_documentation",
    {
      title: "Search documentation",
      description: "Search libraries and packages documentation",
      inputSchema: {
        query: z.string(),
      },
    },
    async ({ query }) => {
      const result = await db.search(query);

      return {
        content: result.map((item) => ({
          type: "resource_link",
          uri: `sidekit://documentations/${item.id}.md`,
          name: item.id,
          mimeType: "text/markdown",
        })),
      };
    },
  );

  return {
    start() {
      const transport = new StdioServerTransport();
      server.connect(transport);
    },
  };
}
