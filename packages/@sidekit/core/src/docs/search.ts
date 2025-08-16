import { loadDatabase } from "@sidekit/search";
import { SearchResult } from "@sidekit/search/types";
import { join } from "pathe";

export type SearchOptions = {
  cwd: string;
  input: string;
  limit?: number;
};

/**
 * Search documentation from vector database.
 */
export async function search({
  cwd,
  input,
  limit,
}: SearchOptions): Promise<SearchResult[]> {
  const path = join(cwd, ".sidekit", "sidekit.db");
  const db = loadDatabase({ filename: path });

  return await db.search(input, { limit });
}
