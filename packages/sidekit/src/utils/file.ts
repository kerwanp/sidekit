import {
  readFile as _readFile,
  writeFile as _writeFile,
  mkdir,
} from "node:fs/promises";
import { FileException } from "../exceptions/file_exception.js";

export async function readFile(path: string) {
  try {
    const content = await _readFile(path, "utf8");
    return content;
  } catch (e: any) {
    throw new FileException(path, "cannot read file", e);
  }
}

export async function writeFile(path: string, content: string) {
  try {
    await _writeFile(path, content);
  } catch (e: any) {
    throw new FileException(path, "cannot write file", e);
  }
}

export async function createDir(path: string) {
  try {
    await mkdir(path, { recursive: true });
  } catch (e: any) {
    throw new FileException(path, "cannot create directory", e);
  }
}
