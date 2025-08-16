import { relative } from "pathe";
import { Exception } from "./exception.js";

export class FileException extends Exception {
  constructor(file: string, message: string, cause: unknown) {
    const path = relative(process.cwd(), file);
    super(`File error (${path}): ${message}`, { cause });
  }
}
