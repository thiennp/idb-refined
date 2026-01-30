import { openDB } from "idb";
import type { IDBPDatabase } from "idb";
import { fingerprint, applySchema } from "./schema.js";
import type { SchemaDef } from "./schema.js";

const META_DB_NAME = "idb-refined-meta";
const META_STORE = "meta";

interface MetaRecord {
  dbName: string;
  schemaFingerprint: string;
  version: number;
}

export interface InitDbOptions {
  schema?: SchemaDef;
  version?: number;
  upgrade?: (db: IDBPDatabase<unknown>) => void;
}

/**
 * Open or create a database. When `schema` is provided, version is auto-detected
 * from a fingerprint; when `version` and/or `upgrade` are provided, use them directly.
 */
export async function initDb(
  name: string,
  options?: InitDbOptions
): Promise<IDBPDatabase<unknown>> {
  if (options?.schema != null) {
    return initDbWithSchema(name, options.schema, options.upgrade);
  }
  const version = options?.version ?? 1;
  return openDB(name, version, {
    upgrade: options?.upgrade,
  }) as Promise<IDBPDatabase<unknown>>;
}

async function initDbWithSchema(
  name: string,
  schema: SchemaDef,
  customUpgrade?: (db: IDBPDatabase<unknown>) => void
): Promise<IDBPDatabase<unknown>> {
  const fp = fingerprint(schema);

  const metaDb = await openDB(META_DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "dbName" });
      }
    },
  });

  const stored = (await metaDb.get(META_STORE, name)) as MetaRecord | undefined;
  metaDb.close();

  let currentVersion = 0;
  try {
    const probe = await openDB(name);
    currentVersion = probe.version;
    probe.close();
  } catch {
    // DB does not exist yet
  }

  const needUpgrade = stored == null || stored.schemaFingerprint !== fp;
  const newVersion = needUpgrade
    ? Math.max((stored?.version ?? 0) + 1, currentVersion + 1)
    : stored!.version;

  const db = (await openDB(name, newVersion, {
    upgrade(db, _oldVersion, _newVersion, transaction) {
      if (needUpgrade) {
        applySchema(db, schema, transaction);
      }
      customUpgrade?.(db as IDBPDatabase<unknown>);
    },
  })) as IDBPDatabase<unknown>;

  if (needUpgrade) {
    const metaDb2 = await openDB(META_DB_NAME, 1);
    await metaDb2.put(META_STORE, {
      dbName: name,
      schemaFingerprint: fp,
      version: newVersion,
    });
    metaDb2.close();
  }

  return db;
}
