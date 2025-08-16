import z from "zod";
import { readFile, writeFile } from "./file.js";
import { InvalidSchemaException } from "../exceptions/invalid_schema_exception.js";
import { format } from "prettier";

export async function readConfig<T extends z.ZodType>(
  path: string,
  schema: T,
): Promise<z.infer<T>> {
  const content = await readFile(path);
  const json = JSON.parse(content);

  try {
    const parsed = schema.parse(json);
    return parsed;
  } catch (e) {
    if (e instanceof z.ZodError) {
      throw new InvalidSchemaException(e, path);
    }

    throw e;
  }
}

export async function updateConfig(path: string, config: any): Promise<void> {
  const content = await format(JSON.stringify(config), { filepath: path });
  await writeFile(path, content);
}
