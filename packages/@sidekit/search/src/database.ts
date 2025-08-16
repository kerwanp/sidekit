import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { createEmbed } from "./embed.js";
import { Entry, SearchResult } from "./types.js";

export type DatabaseOptions = {
  filename: string;
};

export type SearchOptions = {
  limit?: number;
};

export function loadDatabase({ filename }: DatabaseOptions) {
  const db = new Database(filename);

  sqliteVec.load(db);

  db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS docs 
      USING vec0(
        id TEXT PRIMARY KEY,
        embedding float[384],
        name TEXT,
        description TEXT NULLABLE,
        content TEXT
      )
    `);

  return {
    async insert(entry: Entry) {
      const exists = await this.retrieve(entry.id);

      const embed = await createEmbed(entry.content);

      if (exists) {
        db.prepare<[Float32Array, string, string, string, string]>(
          `
          UPDATE docs
          SET embedding = ?, name = ?, description = ?, content = ?
          WHERE id = ?
        `,
        ).run(embed, entry.name, entry.description, entry.content, entry.id);
      } else {
        db.prepare<[string, Float32Array, string, string, string]>(
          `
        INSERT INTO docs(id, embedding, name, description, content)
        VALUES (?, ?, ?, ?, ?)
      `,
        ).run(entry.id, embed, entry.name, entry.description, entry.content);
      }
    },
    async retrieve(id: string) {
      return db
        .prepare<
          [string],
          Entry
        >(`SELECT id, name, description, content FROM docs WHERE id = ?`)
        .get(id);
    },
    async search(query: string, { limit = 5 }: SearchOptions = {}) {
      const embed = await createEmbed(query);

      const rows = db
        .prepare<[Float32Array, number], SearchResult>(
          `
            SELECT id, name, description, content, distance FROM docs 
            WHERE embedding MATCH ? ORDER BY distance LIMIT ?
          `,
        )
        .all(embed, limit);

      return rows;
    },
    async count() {
      const response = db
        .prepare<[], { count: number }>(`SELECT COUNT(*) as count FROM docs`)
        .get();

      return response?.count || 0;
    },
    clear() {
      db.prepare<[], { count: number }>(`DELETE FROM docs`).run();
    },
  };
}
