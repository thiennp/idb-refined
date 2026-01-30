import { describe, it, expect } from "vitest";
import { deleteDB } from "idb";
import { initDb } from "./initDb.js";
import { cleanWhenTooLarge } from "./cleanWhenTooLarge.js";

function uniqueDbName(): string {
  return `cleanWhenTooLarge-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

describe("cleanWhenTooLarge", () => {
  it("evicts oldest entries until count <= maxCount", async () => {
    const DB_NAME = uniqueDbName();
    const db = await initDb(DB_NAME, {
      schema: {
        stores: {
          cache: { keyPath: "id", indexes: ["createdAt"] },
        },
      },
    });

    const base = Date.now();
    await db.put("cache", { id: "1", createdAt: base });
    await db.put("cache", { id: "2", createdAt: base + 1 });
    await db.put("cache", { id: "3", createdAt: base + 2 });
    await db.put("cache", { id: "4", createdAt: base + 3 });
    await db.put("cache", { id: "5", createdAt: base + 4 });

    const deleted = await cleanWhenTooLarge(db, "cache", {
      dateKey: "createdAt",
      maxCount: 2,
    });

    expect(deleted).toBe(3);
    expect(await db.count("cache")).toBe(2);
    expect(await db.get("cache", "1")).toBeUndefined();
    expect(await db.get("cache", "2")).toBeUndefined();
    expect(await db.get("cache", "3")).toBeUndefined();
    expect(await db.get("cache", "4")).toEqual({
      id: "4",
      createdAt: base + 3,
    });
    expect(await db.get("cache", "5")).toEqual({
      id: "5",
      createdAt: base + 4,
    });
    db.close();
    await deleteDB(DB_NAME);
  });

  it("returns 0 when count <= maxCount", async () => {
    const DB_NAME = uniqueDbName();
    const db = await initDb(DB_NAME, {
      schema: {
        stores: {
          cache: { keyPath: "id", indexes: ["createdAt"] },
        },
      },
    });

    await db.put("cache", { id: "1", createdAt: Date.now() });

    const deleted = await cleanWhenTooLarge(db, "cache", {
      dateKey: "createdAt",
      maxCount: 10,
    });

    expect(deleted).toBe(0);
    expect(await db.count("cache")).toBe(1);
    db.close();
    await deleteDB(DB_NAME);
  });
});
