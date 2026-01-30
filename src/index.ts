export { createIdb } from "./client.js";
export type {
  IdbRefinedClient,
  IdbRefinedOptions,
  StoredValue,
  WorkerMessage,
  WorkerResponse,
} from "./client.js";

/** Advanced: low-level helpers when you have a raw IDBPDatabase (e.g. from initDb). */
export { clearStore, deleteByKey } from "./delete.js";
export { putWithEviction } from "./putWithEviction.js";
export type { PutWithEvictionOptions } from "./putWithEviction.js";
