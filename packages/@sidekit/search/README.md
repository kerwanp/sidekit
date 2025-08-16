# @sidekit/search

A small wrapper around [better-sqlite3](https://www.npmjs.com/package/better-sqlite3) and [sqlite-vec](https://github.com/asg017/sqlite-vec) that act as a light, embedded and local vector database.

## Usage

```tsx
import { loadDatabase } from "@sidekit/search";

const db = loadDatabase("/path/to/file.db");

await db.insert({
  id: "document-id",
  content: "Demo document",
});

const result = await db.search("What is the demo document?");
```
