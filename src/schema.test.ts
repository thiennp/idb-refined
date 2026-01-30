import { describe, it, expect, afterEach } from "vitest";
import { openDB } from "idb";
import { fingerprint, applySchema } from "./schema.js";
import type { SchemaDef } from "./schema.js";

describe("fingerprint", () => {
  it("returns stable string for same schema", () => {
    const schema: SchemaDef = {
      stores: {
        cache: { keyPath: "id", indexes: ["expiresAt"] },
      },
    };
    expect(fingerprint(schema)).toBe(fingerprint(schema));
  });

  it("returns different string for different schema", () => {
    const a: SchemaDef = {
      stores: {
        cache: { keyPath: "id", indexes: ["expiresAt"] },
      },
    };
    const b: SchemaDef = {
      stores: {
        cache: { keyPath: "id", indexes: ["expiresAt", "createdAt"] },
      },
    };
    expect(fingerprint(a)).not.toBe(fingerprint(b));
  });

  it("is order-independent for store keys", () => {
    const a: SchemaDef = {
      stores: {
        a: { keyPath: "id" },
        b: { keyPath: "id" },
      },
    };
    const b: SchemaDef = {
      stores: {
        b: { keyPath: "id" },
        a: { keyPath: "id" },
      },
    };
    expect(fingerprint(a)).toBe(fingerprint(b));
  });
});

describe("applySchema", () => {
  const dbName = "apply-schema-test";

  afterEach(async () => {
    const { deleteDB } = await import("idb");
    await deleteDB(dbName);
  });

  it("creates stores and indexes from schema", async () => {
    const schema: SchemaDef = {
      stores: {
        cache: { keyPath: "id", indexes: ["expiresAt"] },
        items: { keyPath: "key", indexes: { byDate: "createdAt" } },
      },
    };
    const db = await openDB(dbName, 1, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        applySchema(db, schema, transaction);
      },
    });
    expect(db.objectStoreNames.contains("cache")).toBe(true);
    expect(db.objectStoreNames.contains("items")).toBe(true);
    const cacheStore = db.transaction("cache").objectStore("cache");
    expect(cacheStore.indexNames.contains("expiresAt")).toBe(true);
    const itemsStore = db.transaction("items").objectStore("items");
    expect(itemsStore.indexNames.contains("byDate")).toBe(true);
    db.close();
  });
});
