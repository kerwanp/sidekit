import { toJSONSchema } from "zod";
import schemas from "../src/index.js";
import { writeFile } from "node:fs/promises";

for (const [name, schema] of Object.entries(schemas)) {
  const json = toJSONSchema(schema);
  const path = new URL(`../../../schemas/${name}.json`, import.meta.url);

  await writeFile(path, JSON.stringify(json));
}
