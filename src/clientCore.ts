import type { IDBPDatabase } from "idb";
import { deleteDB } from "idb";
import { initDb } from "./initDb.js";
import { cleanOldEntries } from "./cleanOldEntries.js";
import { cleanWhenTooLarge } from "./cleanWhenTooLarge.js";
import type { SchemaDef } from "./schema.js";

const DEFAULT_KEY_PATH = "id";
const DATE_INDEXES = ["expiresAt", "createdAt"];
export const DEFAULT_TTL_MS = 3600 * 1000;
const DEFAULT_MAX_COUNT = 1000;

const dbCache = new Map<string, IDBPDatabase<unknown>>();

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

export async function getDb(
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

export function setExpiryFields(
  value: Record<string, unknown>,
  ttlMs: number = DEFAULT_TTL_MS
): void {
  const now = Date.now();
  if (value.createdAt === undefined) value.createdAt = now;
  if (value.expiresAt === undefined) value.expiresAt = now + ttlMs;
}

export interface ExecuteSetOptions {
  ttlMs?: number;
}

export async function executeSet(
  dbName: string,
  storeName: string,
  value: Record<string, unknown>,
  options?: ExecuteSetOptions
): Promise<void> {
  const db = await getDb(dbName, storeName);
  setExpiryFields(value, options?.ttlMs ?? DEFAULT_TTL_MS);
  await cleanOldEntries(db, storeName, {
    dateKey: "expiresAt",
    before: Date.now(),
  });
  const count = await db.count(storeName);
  if (count >= DEFAULT_MAX_COUNT) {
    await cleanWhenTooLarge(db, storeName, {
      dateKey: "createdAt",
      maxCount: DEFAULT_MAX_COUNT,
    });
  }
  await db.put(storeName, value);
  const countAfter = await db.count(storeName);
  if (countAfter > DEFAULT_MAX_COUNT) {
    await cleanWhenTooLarge(db, storeName, {
      dateKey: "createdAt",
      maxCount: DEFAULT_MAX_COUNT,
    });
  }
}

export async function executeGet<T>(
  dbName: string,
  storeName: string,
  key: IDBValidKey
): Promise<T | undefined> {
  const db = await getDb(dbName, storeName);
  return (await db.get(storeName, key)) as T | undefined;
}

export async function executeUpdate(
  dbName: string,
  storeName: string,
  key: IDBValidKey,
  value: Record<string, unknown>
): Promise<void> {
  const db = await getDb(dbName, storeName);
  const withKey = { ...value, [DEFAULT_KEY_PATH]: key };
  await db.put(storeName, withKey);
}

export async function executeDelete(
  dbName: string,
  storeName: string,
  key: IDBValidKey
): Promise<void> {
  const db = await getDb(dbName, storeName);
  await db.delete(storeName, key);
}

export async function executeDeleteDb(dbName: string): Promise<void> {
  const db = dbCache.get(dbName);
  if (db != null) {
    db.close();
    dbCache.delete(dbName);
  }
  await deleteDB(dbName);
}
