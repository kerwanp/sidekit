import { defineCommand } from "citty";
import kit from "./kit/main.js";

export default defineCommand({
  meta: {
    name: "sidekit",
    description: "Manage AI guidelines with ease",
  },
  subCommands: {
    kit,
  },
});
