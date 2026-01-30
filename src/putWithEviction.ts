import type { IDBPDatabase } from "idb";
import { cleanWhenTooLarge } from "./cleanWhenTooLarge.js";
import { DEFAULT_MAX_COUNT, DEFAULT_TTL_SECONDS } from "./constants.js";

export interface PutWithEvictionOptions {
  key?: IDBValidKey;
  dateKey: string;
  /** Evict oldest when store count exceeds this. */
  maxCount?: number;
  /** Absolute expiry timestamp (ms). If set, used for the dateKey field on the value. */
  expiresAt?: number;
  /** Relative expiry in seconds. Used when expiresAt is not set; then dateKey = now + ttlSeconds * 1000. */
  ttlSeconds?: number;
}

/**
 * Put a value in the store, then if count > maxCount evict oldest entries (by dateKey).
 * Optionally set the dateKey field from expiresAt (absolute ms) or ttlSeconds (relative seconds).
 * Value must include the keyPath field, or pass options.key.
 */
export async function putWithEviction<T = unknown>(
  db: IDBPDatabase<unknown>,
  storeName: string,
  value: T,
  options: PutWithEvictionOptions
): Promise<void> {
  const { key, dateKey, expiresAt, ttlSeconds } = options;
  const maxCount = options.maxCount ?? DEFAULT_MAX_COUNT;
  if (typeof value === "object" && value !== null) {
    const valueRecord = value as Record<string, unknown>;
    if (expiresAt !== undefined) {
      valueRecord[dateKey] = expiresAt;
    } else {
      valueRecord[dateKey] =
        Date.now() + (ttlSeconds ?? DEFAULT_TTL_SECONDS) * 1000;
    }
  }
  await db.put(storeName, value as unknown, key);
  const count = await db.count(storeName);
  if (count > maxCount) {
    await cleanWhenTooLarge(db, storeName, { dateKey, maxCount });
  }
}
