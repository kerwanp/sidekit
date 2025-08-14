import { mkdir } from "node:fs/promises";
import { updateKitConfig } from "./update_kit_config.js";
import { join } from "node:path";
import { writeFile } from "../utils/file.js";
import { indexKit } from "./index_kit.js";

export type InitKitOptions = {
  path: string;
  name: string;
  description?: string;
};

/**
 * Intializes an empty Sidekit kit project.
 */
export async function initKit({ path, name, description }: InitKitOptions) {
  await updateKitConfig({
    path,
    config: {
      name,
      description,
      rules: [],
      presets: {},
    },
  });

  await mkdir(join(path, "rules")).catch(() => null);

  await writeFile(
    join(path, "rules", "example.md"),
    [
      "---",
      `parent: ${name.toLowerCase().replace(" ", "-")}`,
      `name: ${name}`,
      `description: Example rule`,
      `type: rule`,
      "---",
      "## Example rule",
      "",
      "This rule is an example",
    ].join("\n"),
  );

  await indexKit({ cwd: path });
}
