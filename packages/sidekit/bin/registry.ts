import { readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "mlly";
import { indexKit } from "../src/kit/index_kit.js";
import { log } from "@clack/prompts";
import { SidekitKit, SidekitRegistry } from "../src/types.js";
import { loadKitConfig } from "../src/kit/load_kit_config.js";
import { updateConfig } from "../src/utils/config.js";

const path = new URL("../../../registry/", import.meta.url);

const kits = new Map<string, SidekitKit>();

for (const folder of await readdir(path)) {
  const kitPath = new URL(folder, path);

  const stats = await stat(kitPath);

  if (!stats.isDirectory()) continue;

  log.step(`Index ${folder} registry kit`);

  await indexKit({ cwd: fileURLToPath(kitPath) });

  const config = await loadKitConfig({ cwd: fileURLToPath(kitPath) });

  kits.set(folder, config);
}

log.step(`Generate registry.json file`);

const registry: SidekitRegistry = {
  $schema: "../schemas/registry.json",
  kits: [
    ...kits.entries().map(([id, kit]) => ({
      id: id,
      name: kit.name,
      description: kit.description,
    })),
  ],
};

await updateConfig(fileURLToPath(new URL("registry.json", path)), registry);
