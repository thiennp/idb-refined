import type { IDBPDatabase } from "idb";

export interface CleanWhenTooLargeOptions {
  dateKey: string;
  /** Target max entries after eviction. */
  maxCount?: number;
}

const DEFAULT_MAX_COUNT = 1000;

/**
 * Evict oldest entries (by dateKey) until store count <= maxCount.
 * Requires an index on dateKey. Returns the number of entries deleted.
 */
export async function cleanWhenTooLarge(
  db: IDBPDatabase<unknown>,
  storeName: string,
  options: CleanWhenTooLargeOptions
): Promise<number> {
  const { dateKey } = options;
  const maxCount = options.maxCount ?? DEFAULT_MAX_COUNT;
  const count = await db.count(storeName);
  if (count <= maxCount) return 0;

  const toDelete = count - maxCount;
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  const index = store.index(dateKey);

  const keysToDelete: IDBValidKey[] = [];
  let cursor = await index.openKeyCursor(null, "next");
  while (cursor != null && keysToDelete.length < toDelete) {
    keysToDelete.push(cursor.primaryKey);
    cursor = await cursor.continue();
  }

  for (const key of keysToDelete) {
    store.delete(key);
  }
  await tx.done;
  return keysToDelete.length;
}
