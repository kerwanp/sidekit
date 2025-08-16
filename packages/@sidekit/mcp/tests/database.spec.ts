import { test } from "@japa/runner";
import { loadDatabase } from "../src/database.js";
import { Entry } from "../src/types.js";

const fixtures: Entry[] = [
  {
    id: "next/0",
    content: "NextJS is cool but I hate cjs",
  },
  {
    id: "vite/0",
    content: "Vite is insane, love it",
  },
  {
    id: "adonisjs/0",
    content: "With adonis you can do anything",
  },
  {
    id: "adonisjs/1",
    content: "AdonisJS is a great framework",
  },
];

test.group("database.insert", () => {
  test("should insert documents", async ({ expect }) => {
    const db = loadDatabase({ filename: ":memory:" });

    await Promise.all(fixtures.map((entry) => db.insert(entry)));

    const result = await db.count();

    expect(result).toBe(fixtures.length);
  });

  test("should upsert documents", async ({ expect }) => {
    const db = loadDatabase({ filename: ":memory:" });

    const fixture = fixtures[0];

    await db.insert(fixture);

    let entry = await db.retrieve(fixture.id);

    expect(entry?.content).toEqual(fixture.content);

    await db.insert({
      id: fixture.id,
      content: "WE DONT TALK ABOUT IT",
    });

    entry = await db.retrieve(fixture.id);

    expect(entry?.content).toEqual("WE DONT TALK ABOUT IT");
  });
});

test.group("database.search", () => {
  test("should search documents", async ({ expect }) => {
    const db = loadDatabase({ filename: ":memory:" });

    await Promise.all(fixtures.map((entry) => db.insert(entry)));

    let result = await db.search("adonisjs");
    expect(result[0].id).toBe("adonisjs/1");

    result = await db.search("adonis");
    expect(result[0].id).toBe("adonisjs/0");

    result = await db.search("How to setup Vite?");
    expect(result[0].id).toBe("vite/0");

    result = await db.search("What is NextJS");
    expect(result[0].id).toBe("next/0");
  });

  test("should search documents with count", async ({ expect }) => {
    const db = loadDatabase({ filename: ":memory:" });

    await Promise.all(fixtures.map((entry) => db.insert(entry)));

    let result = await db.search("adonisjs", { limit: 1 });
    expect(result).toHaveLength(1);

    result = await db.search("adonis", { limit: 3 });
    expect(result).toHaveLength(3);
  });
});
