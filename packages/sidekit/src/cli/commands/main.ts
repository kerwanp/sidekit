import { defineCommand } from "citty";
import kit from "./kit/main.js";
import generate from "./generate.js";
import add from "./add.js";

export default defineCommand({
  meta: {
    name: "sidekit",
    description: "Manage AI guidelines with ease",
  },
  subCommands: {
    kit,
    generate,
    add,
  },
});
