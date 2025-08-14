import { defineCommand } from "citty";
import color from "picocolors";
import { steps } from "../steps.js";
import { initSidekit } from "../../sidekit/init_sidekit.js";

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

    await initSidekit({ path: args.cwd, agents });

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
