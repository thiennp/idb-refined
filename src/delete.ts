import type { IDBPDatabase } from "idb";

/**
 * Delete a single entry by key.
 */
export async function deleteByKey(
  db: IDBPDatabase<unknown>,
  storeName: string,
  key: IDBValidKey
): Promise<void> {
  await db.delete(storeName, key);
}

/**
 * Delete all entries in a store.
 */
export async function clearStore(
  db: IDBPDatabase<unknown>,
  storeName: string
): Promise<void> {
  await db.clear(storeName);
}
