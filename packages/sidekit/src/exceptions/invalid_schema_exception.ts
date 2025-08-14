import z from "zod";
import { Exception } from "./exception.js";
import { relative } from "pathe";

export class InvalidSchemaException extends Exception {
  constructor(error: z.ZodError, path: string) {
    const rel = relative(process.cwd(), path);
    const pretty = z.prettifyError(error);
    super(`Invalid schema (${rel}):\n${pretty}`);
  }
}
