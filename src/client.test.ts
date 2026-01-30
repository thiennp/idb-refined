import { describe, it, expect } from "vitest";
import { openDB, deleteDB } from "idb";
import { createIdb } from "./client.js";

function uniqueDbName(): string {
  return `client-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

describe("createIdb", () => {
  describe("set", () => {
    it("stores value without throwing", async () => {
      const dbName = uniqueDbName();
      const { set, deleteDb } = await createIdb({ dbName });
      await set({ id: "a", name: "Alice" });
      await deleteDb();
      await deleteDB(dbName);
    });
  });

  describe("get", () => {
    it("returns value by key", async () => {
      const dbName = uniqueDbName();
      const { set, get, deleteDb } = await createIdb({ dbName });
      await set({ id: "x", name: "Bob" });
      const stored = await get("x");
      expect(stored).toBeDefined();
      expect((stored as unknown as { id: string; name: string }).id).toBe("x");
      expect((stored as unknown as { id: string; name: string }).name).toBe(
        "Bob"
      );
      await deleteDb();
    });

    it("returns undefined for missing key", async () => {
      const dbName = uniqueDbName();
      const { set, get, deleteDb } = await createIdb({ dbName });
      await set({ id: "a", name: "Alice" });
      const stored = await get("missing");
      expect(stored).toBeUndefined();
      await deleteDb();
    });
  });

  describe("getAll", () => {
    it("returns all values in the store", async () => {
      const dbName = uniqueDbName();
      const { set, getAll, deleteDb } = await createIdb({ dbName });
      await set({ id: "a", name: "Alice" });
      await set({ id: "b", name: "Bob" });
      const all = await getAll();
      expect(all).toHaveLength(2);
      const ids = (all as unknown as { id: string }[]).map((x) => x.id).sort();
      expect(ids).toEqual(["a", "b"]);
      await deleteDb();
    });

    it("returns empty array when store is empty", async () => {
      const dbName = uniqueDbName();
      const { getAll, deleteDb } = await createIdb({ dbName });
      const all = await getAll();
      expect(all).toEqual([]);
      await deleteDb();
    });
  });

  describe("keys", () => {
    it("returns all keys in the store", async () => {
      const dbName = uniqueDbName();
      const { set, keys, deleteDb } = await createIdb({ dbName });
      await set({ id: "x", data: 1 });
      await set({ id: "y", data: 2 });
      const keyList = await keys();
      expect(keyList).toHaveLength(2);
      expect(keyList.sort()).toEqual(["x", "y"]);
      await deleteDb();
    });

    it("returns empty array when store is empty", async () => {
      const dbName = uniqueDbName();
      const { keys, deleteDb } = await createIdb({ dbName });
      const keyList = await keys();
      expect(keyList).toEqual([]);
      await deleteDb();
    });
  });

  describe("getMany", () => {
    it("returns values for multiple keys (undefined where missing)", async () => {
      const dbName = uniqueDbName();
      const { set, getMany, deleteDb } = await createIdb({ dbName });
      await set({ id: "1", name: "One" });
      await set({ id: "2", name: "Two" });
      const results = await getMany(["1", "2", "missing"]);
      expect(results).toHaveLength(3);
      expect((results[0] as unknown as { name: string }).name).toBe("One");
      expect((results[1] as unknown as { name: string }).name).toBe("Two");
      expect(results[2]).toBeUndefined();
      await deleteDb();
    });

    it("returns empty array for empty keys input", async () => {
      const dbName = uniqueDbName();
      const { set, getMany, deleteDb } = await createIdb({ dbName });
      await set({ id: "a", data: 1 });
      const results = await getMany([]);
      expect(results).toEqual([]);
      await deleteDb();
    });
  });

  describe("update", () => {
    it("updates existing entry", async () => {
      const dbName = uniqueDbName();
      const { set, update, deleteDb } = await createIdb({ dbName });
      await set({ id: "1", name: "Old" });
      await update("1", { id: "1", name: "New", createdAt: 0, expiresAt: 999 });

      const db = await openDB(dbName);
      const stored = await db.get("store", "1");
      db.close();
      expect(stored).toBeDefined();
      expect((stored as unknown as { name: string }).name).toBe("New");
      await deleteDb();
    });

    it("merges partial update with existing record (preserves other fields)", async () => {
      const dbName = uniqueDbName();
      const { set, get, update, deleteDb } = await createIdb({ dbName });
      await set({
        id: "1",
        name: "Alice",
        role: "admin",
      });
      await update("1", { name: "Alice Updated" });
      const stored = await get("1");
      expect(stored).toBeDefined();
      expect((stored as unknown as { id: string }).id).toBe("1");
      expect((stored as unknown as { name: string }).name).toBe(
        "Alice Updated"
      );
      expect((stored as unknown as { role: string }).role).toBe("admin");
      await deleteDb();
    });
  });

  describe("same dbName, different storeName", () => {
    it("uses separate stores when storeName differs", async () => {
      const dbName = uniqueDbName();
      const users = await createIdb<{ id: string; name: string }>({
        dbName,
        storeName: "users",
      });
      const sessions = await createIdb<{ id: string; token: string }>({
        dbName,
        storeName: "sessions",
      });
      await users.set({ id: "u1", name: "Alice" });
      await sessions.set({ id: "s1", token: "abc" });

      const u = await users.get("u1");
      const s = await sessions.get("s1");
      expect(u).toBeDefined();
      expect((u as unknown as { name: string }).name).toBe("Alice");
      expect(s).toBeDefined();
      expect((s as unknown as { token: string }).token).toBe("abc");

      await users.deleteDb();
    });
  });

  describe("delete", () => {
    it("deletes entry by key", async () => {
      const dbName = uniqueDbName();
      const { set, delete: del, deleteDb } = await createIdb({ dbName });
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
      const { set, deleteDb } = await createIdb({ dbName });
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

    it("allows reusing same dbName after deleteDb (meta cleared)", async () => {
      const dbName = uniqueDbName();
      const client1 = await createIdb({ dbName });
      await client1.set({ id: "a", data: 1 });
      await client1.deleteDb();

      const client2 = await createIdb({ dbName });
      await client2.set({ id: "b", data: 2 });
      const got = await client2.get("b");
      expect(got).toBeDefined();
      expect((got as unknown as { id: string }).id).toBe("b");
      await client2.deleteDb();
      await deleteDB(dbName);
    });
  });
});
