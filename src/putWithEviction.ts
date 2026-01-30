import type { IDBPDatabase } from "idb";
import { cleanWhenTooLarge } from "./cleanWhenTooLarge.js";

export interface PutWithEvictionOptions {
  key?: IDBValidKey;
  dateKey: string;
  maxCount: number;
}

/**
 * Put a value in the store, then if count > maxCount evict oldest entries (by dateKey).
 * Value must include the keyPath field, or pass options.key.
 */
export async function putWithEviction<T = unknown>(
  db: IDBPDatabase<unknown>,
  storeName: string,
  value: T,
  options: PutWithEvictionOptions
): Promise<void> {
  const { key, dateKey, maxCount } = options;
  await db.put(storeName, value as unknown, key);
  const count = await db.count(storeName);
  if (count > maxCount) {
    await cleanWhenTooLarge(db, storeName, { dateKey, maxCount });
  }
}
