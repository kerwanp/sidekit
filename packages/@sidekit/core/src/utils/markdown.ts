import z from "zod";
import fm from "front-matter";
import { readFile, writeFile } from "./file.js";
import { basename, extname } from "pathe";
import { InvalidSchemaException } from "../exceptions/invalid_schema_exception.js";
import * as YAML from "yaml";

export async function readMarkdown<T extends z.ZodType>(
  path: string,
  schema: T,
): Promise<z.infer<T>> {
  const content = await readFile(path);
  const data = (fm as any)(content);
  const id = basename(path, extname(path));

  try {
    const parsed = schema.parse({
      ...data.attributes,
      id,
      content: data.body,
    });
    return parsed;
  } catch (e) {
    if (e instanceof z.ZodError) {
      throw new InvalidSchemaException(e, id);
    }
    throw e;
  }
}

export async function writeMarkdown(
  path: string,
  content: string,
  attributes: any,
) {
  const matter = YAML.stringify(attributes);

  await writeFile(path, ["---", matter, "---", content].join("\n"));
}
