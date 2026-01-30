import { describe, it, expect } from "vitest";
import { deleteDB } from "idb";
import { initDb } from "./initDb.js";
import { cleanOldEntries } from "./cleanOldEntries.js";

function uniqueDbName(): string {
  return `cleanOldEntries-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

describe("cleanOldEntries", () => {
  it("deletes entries where dateKey < before", async () => {
    const DB_NAME = uniqueDbName();
    const db = await initDb(DB_NAME, {
      schema: {
        stores: {
          cache: { keyPath: "id", indexes: ["expiresAt"] },
        },
      },
    });

    const now = Date.now();
    await db.put("cache", { id: "a", expiresAt: now - 2000 });
    await db.put("cache", { id: "b", expiresAt: now - 1000 });
    await db.put("cache", { id: "c", expiresAt: now + 1000 });

    await cleanOldEntries(db, "cache", {
      dateKey: "expiresAt",
      before: now,
    });

    expect(await db.get("cache", "a")).toBeUndefined();
    expect(await db.get("cache", "b")).toBeUndefined();
    expect(await db.get("cache", "c")).toEqual({
      id: "c",
      expiresAt: now + 1000,
    });
    db.close();
    await deleteDB(DB_NAME);
  });

  it("deletes nothing when no entries match", async () => {
    const DB_NAME = uniqueDbName();
    const db = await initDb(DB_NAME, {
      schema: {
        stores: {
          cache: { keyPath: "id", indexes: ["expiresAt"] },
        },
      },
    });

    const now = Date.now();
    await db.put("cache", { id: "a", expiresAt: now + 1000 });

    await cleanOldEntries(db, "cache", {
      dateKey: "expiresAt",
      before: now,
    });

    expect(await db.get("cache", "a")).toEqual({
      id: "a",
      expiresAt: now + 1000,
    });
    db.close();
    await deleteDB(DB_NAME);
  });
});
