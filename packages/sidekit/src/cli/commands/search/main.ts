import { defineCommand } from "citty";
import { GlobalArgs } from "../../args.js";
import { loadDatabase } from "@sidekit/search";
import { join } from "pathe";

export default defineCommand({
  meta: {
    name: "search",
    description: "Search documentation entries",
  },
  args: {
    ...GlobalArgs,
    query: {
      type: "positional",
      description: "Your search query",
      required: true,
    },
  },
  async run({ args }) {
    const path = join(args.cwd, ".sidekit", "sidekit.db");
    const db = loadDatabase({ filename: path });

    const results = await db.search(args.query);

    console.log(results);
  },
});
