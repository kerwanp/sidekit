import { defineCommand } from "citty";
import { initSidekit } from "../../../kit.js";
import { intro, log, outro, text } from "@clack/prompts";

export default defineCommand({
  meta: {
    name: "init",
    description: "Initialize a new Sidekit kit",
  },
  async run() {
    intro(`sidekit kit init`);

    const name = await text({
      message: "What is the name of your kit?",
    });

    if (typeof name === "symbol") process.exit();

    const description = await text({
      message: "Provide a short description",
    });

    if (typeof description === "symbol") process.exit();

    await initSidekit({ cwd: process.cwd(), name, description });

    log.success(`${name} kit has been initialized`);

    outro(`end`);
  },
});
