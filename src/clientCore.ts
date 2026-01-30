import type { IDBPDatabase } from "idb";
import { deleteDB } from "idb";
import { initDb } from "./initDb.js";
import { cleanOldEntries } from "./cleanOldEntries.js";
import { cleanWhenTooLarge } from "./cleanWhenTooLarge.js";
import type { SchemaDef } from "./schema.js";
import { DEFAULT_MAX_COUNT, DEFAULT_TTL_MS } from "./constants.js";

export { DEFAULT_TTL_MS } from "./constants.js";

const DEFAULT_KEY_PATH = "id";
const DATE_INDEXES = ["expiresAt", "createdAt"];

interface CachedDb {
  db: IDBPDatabase<unknown>;
  storeNames: Set<string>;
}

const dbCache = new Map<string, CachedDb>();

function getDefaultSchema(storeNames: string[]): SchemaDef {
  const stores: SchemaDef["stores"] = {};
  for (const name of storeNames) {
    stores[name] = {
      keyPath: DEFAULT_KEY_PATH,
      indexes: DATE_INDEXES,
    };
  }
  return { stores };
}

export async function getDb(
  dbName: string,
  storeName: string
): Promise<IDBPDatabase<unknown>> {
  const entry = dbCache.get(dbName);
  if (entry != null && entry.storeNames.has(storeName)) {
    return entry.db;
  }
  const existingStores = entry != null ? [...entry.storeNames] : [];
  if (entry != null) {
    entry.db.close();
    dbCache.delete(dbName);
  }
  const allStores = existingStores.includes(storeName)
    ? existingStores
    : [...existingStores, storeName];
  const schema = getDefaultSchema(allStores);
  const db = await initDb(dbName, { schema });
  dbCache.set(dbName, {
    db,
    storeNames: new Set(allStores),
  });
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
  /** Max entries before eviction. Default: 1000. */
  maxCount?: number;
}

export async function executeSet(
  dbName: string,
  storeName: string,
  value: Record<string, unknown>,
  options?: ExecuteSetOptions
): Promise<void> {
  const db = await getDb(dbName, storeName);
  const toStore = { ...value };
  setExpiryFields(toStore, options?.ttlMs ?? DEFAULT_TTL_MS);
  await cleanOldEntries(db, storeName, {
    dateKey: "expiresAt",
    before: Date.now(),
  });
  const maxCount = options?.maxCount ?? DEFAULT_MAX_COUNT;
  const count = await db.count(storeName);
  if (count >= maxCount) {
    await cleanWhenTooLarge(db, storeName, {
      dateKey: "createdAt",
      maxCount,
    });
  }
  await db.put(storeName, toStore);
  const countAfter = await db.count(storeName);
  if (countAfter > maxCount) {
    await cleanWhenTooLarge(db, storeName, {
      dateKey: "createdAt",
      maxCount,
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
  const existing = (await db.get(storeName, key)) as
    | Record<string, unknown>
    | undefined;
  const merged = {
    ...(existing ?? {}),
    ...value,
    [DEFAULT_KEY_PATH]: key,
  };
  await db.put(storeName, merged);
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
  const entry = dbCache.get(dbName);
  if (entry != null) {
    entry.db.close();
    dbCache.delete(dbName);
  }
  await deleteDB(dbName);
}
