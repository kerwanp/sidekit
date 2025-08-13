import { defineCommand } from "citty";
import add from "./add.js";

export default defineCommand({
  meta: {
    name: "sidekick",
    description: "Manage AI guidelines with ease",
  },
  subCommands: {
    add,
  },
});
