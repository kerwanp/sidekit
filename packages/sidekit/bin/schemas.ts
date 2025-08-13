import { toJSONSchema } from "zod";
import { schemas } from "../src/schemas.js";
import { writeFile } from "node:fs/promises";
import { format } from "prettier";
import { log } from "@clack/prompts";

log.info("Generating schema files");

for (const [name, schema] of Object.entries(schemas)) {
  const json = toJSONSchema(schema);
  const path = new URL(`../../../schemas/${name}.json`, import.meta.url);
  await writeFile(
    path,
    await format(JSON.stringify(json), {
      filepath: path.href,
    }),
  );
}

log.success(`${Object.values(schemas).length} schemas generated`);
