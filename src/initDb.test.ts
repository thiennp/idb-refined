import { describe, it, expect } from "vitest";
import { deleteDB } from "idb";
import { initDb } from "./initDb.js";

function uniqueDbName(): string {
  return `initDb-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

describe("initDb", () => {
  it("opens DB with schema and auto-version", async () => {
    const DB_NAME = uniqueDbName();
    const db = await initDb(DB_NAME, {
      schema: {
        stores: {
          cache: { keyPath: "id", indexes: ["expiresAt"] },
        },
      },
    });
    expect(db.name).toBe(DB_NAME);
    expect(db.objectStoreNames.contains("cache")).toBe(true);
    const store = db.transaction("cache").objectStore("cache");
    expect(store.indexNames.contains("expiresAt")).toBe(true);
    db.close();
    await deleteDB(DB_NAME);
  });

  it("opens same DB with same schema without re-upgrading", async () => {
    const DB_NAME = uniqueDbName();
    const db1 = await initDb(DB_NAME, {
      schema: {
        stores: {
          cache: { keyPath: "id", indexes: ["expiresAt"] },
        },
      },
    });
    const version1 = db1.version;
    db1.close();

    const db2 = await initDb(DB_NAME, {
      schema: {
        stores: {
          cache: { keyPath: "id", indexes: ["expiresAt"] },
        },
      },
    });
    expect(db2.version).toBe(version1);
    db2.close();
    await deleteDB(DB_NAME);
  });

  it("opens DB with version and upgrade callback", async () => {
    const DB_NAME = uniqueDbName();
    const db = await initDb(DB_NAME, {
      version: 1,
      upgrade(db) {
        const store = db.createObjectStore("keyval");
        expect(store).toBeDefined();
      },
    });
    expect(db.objectStoreNames.contains("keyval")).toBe(true);
    expect(db.version).toBe(1);
    db.close();
    await deleteDB(DB_NAME);
  });

  it("opens DB with version 1 when no options", async () => {
    const DB_NAME = uniqueDbName();
    const db = await initDb(DB_NAME);
    expect(db.version).toBe(1);
    db.close();
    await deleteDB(DB_NAME);
  });
});
