import { defineCommand } from "citty";
import init from "./init.js";
import index from "./index.js";

export default defineCommand({
  meta: {
    name: "kit",
    description: "Manage Sidekit kits",
  },
  subCommands: {
    init,
    index,
  },
});
