import { describe, it, expect } from "vitest";
import { deleteDB } from "idb";
import { initDb } from "./initDb.js";
import { putWithEviction } from "./putWithEviction.js";

function uniqueDbName(): string {
  return `putWithEviction-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

describe("putWithEviction", () => {
  it("puts value and evicts oldest when count > maxCount", async () => {
    const DB_NAME = uniqueDbName();
    const db = await initDb(DB_NAME, {
      schema: {
        stores: {
          cache: { keyPath: "id", indexes: ["createdAt"] },
        },
      },
    });

    const base = Date.now();
    await putWithEviction(
      db,
      "cache",
      { id: "1", createdAt: base },
      {
        dateKey: "createdAt",
        maxCount: 3,
        expiresAt: base,
      }
    );
    await putWithEviction(
      db,
      "cache",
      { id: "2", createdAt: base + 1 },
      {
        dateKey: "createdAt",
        maxCount: 3,
        expiresAt: base + 1,
      }
    );
    await putWithEviction(
      db,
      "cache",
      { id: "3", createdAt: base + 2 },
      {
        dateKey: "createdAt",
        maxCount: 3,
        expiresAt: base + 2,
      }
    );
    await putWithEviction(
      db,
      "cache",
      { id: "4", createdAt: base + 3 },
      {
        dateKey: "createdAt",
        maxCount: 3,
        expiresAt: base + 3,
      }
    );

    expect(await db.count("cache")).toBe(3);
    expect(await db.get("cache", "1")).toBeUndefined();
    expect(await db.get("cache", "2")).toEqual({
      id: "2",
      createdAt: base + 1,
    });
    expect(await db.get("cache", "3")).toEqual({
      id: "3",
      createdAt: base + 2,
    });
    expect(await db.get("cache", "4")).toEqual({
      id: "4",
      createdAt: base + 3,
    });
    db.close();
    await deleteDB(DB_NAME);
  });

  it("puts value without eviction when count <= maxCount", async () => {
    const DB_NAME = uniqueDbName();
    const db = await initDb(DB_NAME, {
      schema: {
        stores: {
          cache: { keyPath: "id", indexes: ["createdAt"] },
        },
      },
    });

    await putWithEviction(
      db,
      "cache",
      { id: "a", createdAt: Date.now() },
      { dateKey: "createdAt", maxCount: 10 }
    );

    expect(await db.count("cache")).toBe(1);
    expect(await db.get("cache", "a")).toBeDefined();
    db.close();
    await deleteDB(DB_NAME);
  });

  it("sets dateKey from ttlSeconds when expiresAt not provided", async () => {
    const DB_NAME = uniqueDbName();
    const db = await initDb(DB_NAME, {
      schema: {
        stores: {
          cache: { keyPath: "id", indexes: ["expiresAt"] },
        },
      },
    });

    const before = Date.now();
    await putWithEviction(
      db,
      "cache",
      { id: "x" },
      {
        dateKey: "expiresAt",
        maxCount: 10,
        ttlSeconds: 60,
      }
    );
    const after = Date.now();
    const stored = await db.get("cache", "x");
    expect(stored).toBeDefined();
    expect(
      (stored as unknown as { expiresAt: number }).expiresAt
    ).toBeGreaterThanOrEqual(before + 60 * 1000);
    expect(
      (stored as unknown as { expiresAt: number }).expiresAt
    ).toBeLessThanOrEqual(after + 60 * 1000 + 10);
    db.close();
    await deleteDB(DB_NAME);
  });

  it("sets dateKey from expiresAt when provided", async () => {
    const DB_NAME = uniqueDbName();
    const db = await initDb(DB_NAME, {
      schema: {
        stores: {
          cache: { keyPath: "id", indexes: ["expiresAt"] },
        },
      },
    });

    const at = 1234567890000;
    await putWithEviction(
      db,
      "cache",
      { id: "y" },
      {
        dateKey: "expiresAt",
        maxCount: 10,
        expiresAt: at,
      }
    );
    const stored = await db.get("cache", "y");
    expect((stored as unknown as { expiresAt: number }).expiresAt).toBe(at);
    db.close();
    await deleteDB(DB_NAME);
  });

  it("puts value with options.key when keyPath not in value", async () => {
    const DB_NAME = uniqueDbName();
    const db = await initDb(DB_NAME, {
      schema: {
        stores: {
          keyval: {}, // no keyPath
        },
      },
    });

    await putWithEviction(db, "keyval", "value", {
      key: "mykey",
      dateKey: "createdAt",
      maxCount: 5,
    });

    expect(await db.get("keyval", "mykey")).toBe("value");
    db.close();
    await deleteDB(DB_NAME);
  });
});
