import type { IDBPDatabase } from "idb";

export interface CleanOldEntriesOptions {
  dateKey: string;
  before: number;
}

/**
 * Delete entries in a store where the date/timestamp field is before the threshold.
 * Requires an index on `dateKey`. Uses timestamp in ms (e.g. Date.now()).
 */
export async function cleanOldEntries(
  db: IDBPDatabase<unknown>,
  storeName: string,
  options: CleanOldEntriesOptions
): Promise<void> {
  const { dateKey, before } = options;
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  const index = store.index(dateKey);
  const range = IDBKeyRange.upperBound(before, true);
  const keysToDelete = await index.getAllKeys(range);
  for (const key of keysToDelete) {
    store.delete(key);
  }
  await tx.done;
}
