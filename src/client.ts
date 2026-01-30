import type { IDBPDatabase } from "idb";
import { deleteDB } from "idb";
import { initDb } from "./initDb.js";
import { cleanOldEntries } from "./cleanOldEntries.js";
import { cleanWhenTooLarge } from "./cleanWhenTooLarge.js";
import type { SchemaDef } from "./schema.js";

const DEFAULT_STORE_NAME = "store";
const DEFAULT_KEY_PATH = "id";
const DATE_INDEXES = ["expiresAt", "createdAt"];
const DEFAULT_TTL_MS = 3600 * 1000;
const DEFAULT_MAX_COUNT = 1000;

const dbCache = new Map<string, IDBPDatabase<unknown>>();

export interface CreateClientOptions {
  dbName: string;
  storeName?: string;
}

function getDefaultSchema(storeName: string): SchemaDef {
  return {
    stores: {
      [storeName]: {
        keyPath: DEFAULT_KEY_PATH,
        indexes: DATE_INDEXES,
      },
    },
  };
}

async function getDb(
  dbName: string,
  storeName: string
): Promise<IDBPDatabase<unknown>> {
  let db = dbCache.get(dbName);
  if (db != null) return db;
  const schema = getDefaultSchema(storeName);
  db = await initDb(dbName, { schema });
  dbCache.set(dbName, db);
  return db;
}

function setExpiryFields(value: Record<string, unknown>): void {
  const now = Date.now();
  if (value.createdAt === undefined) value.createdAt = now;
  if (value.expiresAt === undefined) value.expiresAt = now + DEFAULT_TTL_MS;
}

/** Stored value must have `id`. `createdAt` and `expiresAt` are set by the client if missing. */
export type StoredValue = Record<string, unknown> & { id: IDBValidKey };

export interface IdbRefinedClient<T extends StoredValue = StoredValue> {
  set: (value: T) => Promise<void>;
  get: (key: IDBValidKey) => Promise<T | undefined>;
  update: (key: IDBValidKey, value: Partial<T>) => Promise<void>;
  delete: (key: IDBValidKey) => Promise<void>;
  deleteDb: () => Promise<void>;
}

/**
 * Create a client that exposes set, get, update, delete, deleteDb.
 * Init, schema, cleanup and eviction run automatically.
 * @template T - Stored value shape (must include `id`). Omit for a generic client.
 */
export function createClient<T extends StoredValue = StoredValue>(
  options: CreateClientOptions
): IdbRefinedClient<T> {
  const { dbName } = options;
  const storeName = options.storeName ?? DEFAULT_STORE_NAME;

  return {
    async set(value: T) {
      const db = await getDb(dbName, storeName);
      setExpiryFields(value as Record<string, unknown>);
      await db.put(storeName, value);
      const count = await db.count(storeName);
      if (count > DEFAULT_MAX_COUNT) {
        await cleanWhenTooLarge(db, storeName, {
          dateKey: "createdAt",
          maxCount: DEFAULT_MAX_COUNT,
        });
      }
      await cleanOldEntries(db, storeName, {
        dateKey: "expiresAt",
        before: Date.now(),
      });
    },

    async get(key: IDBValidKey) {
      const db = await getDb(dbName, storeName);
      return (await db.get(storeName, key)) as T | undefined;
    },

    async update(key: IDBValidKey, value: Partial<T>) {
      const db = await getDb(dbName, storeName);
      const withKey = { ...value, [DEFAULT_KEY_PATH]: key } as T;
      await db.put(storeName, withKey);
    },

    async delete(key: IDBValidKey) {
      const db = await getDb(dbName, storeName);
      await db.delete(storeName, key);
    },

    async deleteDb() {
      const db = dbCache.get(dbName);
      if (db != null) {
        db.close();
        dbCache.delete(dbName);
      }
      await deleteDB(dbName);
    },
  };
}
