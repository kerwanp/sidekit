import { fileURLToPath, resolvePath } from "mlly";
import { existsSync } from "node:fs";
import { dirname } from "pathe";

async function resolvePathSafe(id: string, parent?: string | URL) {
  try {
    const path = await resolvePath(id, { url: parent });
    return path;
  } catch (e) {
    return;
  }
}

export async function resolveModulePath(id: string, parent?: string | URL) {
  const path = await resolvePathSafe(id, parent);
  if (!path) return;

  let currentDir = dirname(fileURLToPath(path));

  // Walk up until we find package.json
  while (currentDir !== dirname(currentDir)) {
    if (existsSync(`${currentDir}/package.json`)) {
      return currentDir;
    }
    currentDir = dirname(currentDir);
  }

  return;
}
