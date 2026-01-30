import { describe, it, expect } from "vitest";
import { openDB } from "idb";
import { initDb, deleteDB } from "./index.js";

function uniqueDbName(): string {
  return `deleteDB-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

describe("deleteDB", () => {
  it("deletes the database", async () => {
    const DB_NAME = uniqueDbName();
    const db = await initDb(DB_NAME, {
      schema: {
        stores: {
          cache: { keyPath: "id" },
        },
      },
    });
    await db.put("cache", { id: "x", data: 1 });
    db.close();

    await deleteDB(DB_NAME);

    // Re-open with raw openDB so we get a fresh DB with stores (initDb would use stale meta)
    const db2 = await openDB(DB_NAME, 1, {
      upgrade(database) {
        database.createObjectStore("cache", { keyPath: "id" });
      },
    });
    expect(await db2.count("cache")).toBe(0);
    expect(await db2.get("cache", "x")).toBeUndefined();
    db2.close();
    await deleteDB(DB_NAME);
  });
});
