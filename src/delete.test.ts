import { describe, it, expect } from "vitest";
import { deleteDB } from "idb";
import { initDb } from "./initDb.js";
import { deleteByKey, clearStore } from "./delete.js";

function uniqueDbName(): string {
  return `delete-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

describe("deleteByKey", () => {
  it("deletes a single entry by key", async () => {
    const DB_NAME = uniqueDbName();
    const db = await initDb(DB_NAME, {
      schema: {
        stores: {
          cache: { keyPath: "id" },
        },
      },
    });

    await db.put("cache", { id: "a", data: 1 });
    await db.put("cache", { id: "b", data: 2 });

    await deleteByKey(db, "cache", "a");

    expect(await db.get("cache", "a")).toBeUndefined();
    expect(await db.get("cache", "b")).toEqual({ id: "b", data: 2 });
    db.close();
    await deleteDB(DB_NAME);
  });
});

describe("clearStore", () => {
  it("deletes all entries in a store", async () => {
    const DB_NAME = uniqueDbName();
    const db = await initDb(DB_NAME, {
      schema: {
        stores: {
          cache: { keyPath: "id" },
        },
      },
    });

    await db.put("cache", { id: "a", data: 1 });
    await db.put("cache", { id: "b", data: 2 });

    await clearStore(db, "cache");

    expect(await db.count("cache")).toBe(0);
    expect(await db.get("cache", "a")).toBeUndefined();
    expect(await db.get("cache", "b")).toBeUndefined();
    db.close();
    await deleteDB(DB_NAME);
  });
});
