import { defineCommand } from "citty";
import refresh from "./refresh.js";
import clear from "./clear.js";

export default defineCommand({
  meta: {
    name: "db",
    description: "Manage vector database",
  },
  subCommands: {
    refresh,
    clear,
  },
});
