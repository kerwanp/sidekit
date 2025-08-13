import { intro, outro, spinner } from "@clack/prompts";
import { initSidekit } from "@sidekit/core/kit";
import { defineCommand } from "citty";

export default defineCommand({
  meta: {
    name: "init",
    description: "Initialize a new Sidekit kit project",
  },
  run(context) {
    intro("sidekit kit init");

    outro("initialized");
  },
});
