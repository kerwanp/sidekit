import { intro, multiselect, select } from "@clack/prompts";
import { defineCommand } from "citty";
import color from "picocolors";
import { initSidekit } from "../../sidekit.js";
import { steps } from "../steps.js";

export default defineCommand({
  meta: {
    name: "init",
    description: "Initialize Sidekit",
  },
  args: {
    cwd: {
      type: "positional",
      required: false,
      default: process.cwd(),
    },
  },
  async run({ args }) {
    console.log(
      color.red(`
░██████╗██╗██████╗░███████╗██╗░░██╗██╗████████╗
██╔════╝██║██╔══██╗██╔════╝██║░██╔╝██║╚══██╔══╝
╚█████╗░██║██║░░██║█████╗░░█████═╝░██║░░░██║░░░
░╚═══██╗██║██║░░██║██╔══╝░░██╔═██╗░██║░░░██║░░░
██████╔╝██║██████╔╝███████╗██║░╚██╗██║░░░██║░░░
╚═════╝░╚═╝╚═════╝░╚══════╝╚═╝░░╚═╝╚═╝░░░╚═╝░░░
`),
    );

    const agents = await steps.selectAgents();

    await initSidekit({ cwd: args.cwd, agents });

    console.log(
      color.yellow(`
╭
│ Welcome to Sidekit
│ 
│ Get started
│ ↪  Docs: ${color.cyan(`https://github.com/kerwanp/sidekit`)}
│ ↪  Add rules: ${color.blue("`sidekit add`")}
╰
`),
    );
  },
});
