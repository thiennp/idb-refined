import { describe, it, expect } from "vitest";
import { openDB, deleteDB } from "idb";
import { createClient } from "./client.js";

function uniqueDbName(): string {
  return `client-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

describe("createClient", () => {
  describe("set", () => {
    it("stores value without throwing", async () => {
      const dbName = uniqueDbName();
      const { set, deleteDb } = createClient({ dbName });
      await set({ id: "a", name: "Alice" });
      await deleteDb();
      await deleteDB(dbName);
    });
  });

  describe("get", () => {
    it("returns value by key", async () => {
      const dbName = uniqueDbName();
      const { set, get, deleteDb } = createClient({ dbName });
      await set({ id: "x", name: "Bob" });
      const stored = await get("x");
      expect(stored).toBeDefined();
      expect((stored as { id: string }).id).toBe("x");
      expect((stored as { name: string }).name).toBe("Bob");
      await deleteDb();
    });

    it("returns undefined for missing key", async () => {
      const dbName = uniqueDbName();
      const { set, get, deleteDb } = createClient({ dbName });
      await set({ id: "a", name: "Alice" });
      const stored = await get("missing");
      expect(stored).toBeUndefined();
      await deleteDb();
    });
  });

  describe("update", () => {
    it("updates existing entry", async () => {
      const dbName = uniqueDbName();
      const { set, update, deleteDb } = createClient({ dbName });
      await set({ id: "1", name: "Old" });
      await update("1", { id: "1", name: "New", createdAt: 0, expiresAt: 999 });

      const db = await openDB(dbName);
      const stored = await db.get("store", "1");
      db.close();
      expect(stored).toBeDefined();
      expect((stored as { name: string }).name).toBe("New");
      await deleteDb();
    });
  });

  describe("delete", () => {
    it("deletes entry by key", async () => {
      const dbName = uniqueDbName();
      const { set, delete: del, deleteDb } = createClient({ dbName });
      await set({ id: "x", data: 1 });
      await del("x");

      const db = await openDB(dbName);
      const stored = await db.get("store", "x");
      db.close();
      expect(stored).toBeUndefined();
      await deleteDb();
    });
  });

  describe("deleteDb", () => {
    it("deletes the database", async () => {
      const dbName = uniqueDbName();
      const { set, deleteDb } = createClient({ dbName });
      await set({ id: "y", data: 1 });
      await deleteDb();

      const db = await openDB(dbName, 1, {
        upgrade(database) {
          database.createObjectStore("store", { keyPath: "id" });
        },
      });
      expect(await db.count("store")).toBe(0);
      db.close();
      await deleteDB(dbName);
    });
  });
});
