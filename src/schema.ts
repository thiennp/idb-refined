import type { IDBPDatabase, IDBPTransaction } from "idb";

/**
 * Definition for a single object store.
 * - keyPath: optional key path (e.g. 'id')
 * - autoIncrement: optional
 * - indexes: array of index names (keyPath = name) or record indexName -> keyPath | keyPath[]
 */
export interface StoreDef {
  keyPath?: string;
  autoIncrement?: boolean;
  indexes?: string[] | Record<string, string | string[]>;
}

/**
 * Declarative schema: store names -> store definitions.
 */
export interface SchemaDef {
  stores: Record<string, StoreDef>;
}

/**
 * Stable fingerprint for schema (sorted keys) so any schema change produces a different string.
 */
export function fingerprint(schema: SchemaDef): string {
  const normalized: Record<string, unknown> = {};
  for (const name of Object.keys(schema.stores).sort()) {
    const def = schema.stores[name];
    const indexes =
      def.indexes == null
        ? undefined
        : Array.isArray(def.indexes)
          ? [...def.indexes].sort()
          : Object.fromEntries(
              Object.keys(def.indexes as Record<string, string | string[]>)
                .sort()
                .map((k) => [k, (def.indexes as Record<string, string | string[]>)[k]])
            );
    normalized[name] = {
      keyPath: def.keyPath,
      autoIncrement: def.autoIncrement,
      indexes,
    };
  }
  return JSON.stringify(normalized);
}

/**
 * Create object stores and indexes from schema. Call this from within an upgrade callback.
 * Pass the upgrade transaction so existing stores can get new indexes. Skips stores/indexes that already exist.
 */
export function applySchema(
  db: IDBPDatabase<unknown>,
  schema: SchemaDef,
  transaction: IDBPTransaction<unknown, string[], "versionchange">
): void {
  for (const [storeName, def] of Object.entries(schema.stores)) {
    const store = !db.objectStoreNames.contains(storeName)
      ? db.createObjectStore(storeName, {
          keyPath: def.keyPath,
          autoIncrement: def.autoIncrement ?? false,
        })
      : transaction.objectStore(storeName);
    if (def.indexes) {
      const indexEntries = Array.isArray(def.indexes)
        ? (def.indexes as string[]).map((name) => [name, name] as const)
        : Object.entries(def.indexes);
      for (const [indexName, keyPath] of indexEntries) {
        if (!store.indexNames.contains(indexName)) {
          store.createIndex(indexName, keyPath as string);
        }
      }
    }
  }
}
