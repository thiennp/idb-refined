import {
  executeDelete as execDelete,
  executeDeleteDb as execDeleteDb,
  executeGet as execGet,
  executeSet as execSet,
  executeUpdate as execUpdate,
} from "./clientCore.js";

const DEFAULT_STORE_NAME = "store";

export interface IdbRefinedOptions {
  dbName: string;
  storeName?: string;
  /** Default TTL in ms for values without `expiresAt`. Default: 3600000 (1 hour). */
  ttlMs?: number;
}

/** Stored value must have `id`. `createdAt` and `expiresAt` are set by the client if missing. */
export type StoredValue = Record<string, unknown> & { id: IDBValidKey };

export interface IdbRefinedClient<T extends StoredValue = StoredValue> {
  set: (value: T) => Promise<void>;
  get: (key: IDBValidKey) => Promise<T | undefined>;
  update: (key: IDBValidKey, value: Partial<T>) => Promise<void>;
  delete: (key: IDBValidKey) => Promise<void>;
  deleteDb: () => Promise<void>;
}

export type { WorkerMessage, WorkerResponse } from "./workerProtocol.js";
import type { WorkerMessage, WorkerResponse } from "./workerProtocol.js";

function mainThreadClient<T extends StoredValue>(
  dbName: string,
  storeName: string,
  ttlMs: number | undefined
): IdbRefinedClient<T> {
  return {
    async set(value: T) {
      await execSet(dbName, storeName, value as Record<string, unknown>, {
        ttlMs,
      });
    },
    async get(key: IDBValidKey) {
      return execGet<T>(dbName, storeName, key);
    },
    async update(key: IDBValidKey, value: Partial<T>) {
      await execUpdate(
        dbName,
        storeName,
        key,
        value as Record<string, unknown>
      );
    },
    async delete(key: IDBValidKey) {
      await execDelete(dbName, storeName, key);
    },
    async deleteDb() {
      await execDeleteDb(dbName);
    },
  };
}

/**
 * Create an idb-refined client. Uses a Web Worker by default (browser); falls back to main thread when Worker is unavailable (e.g. Node/tests).
 * Worker URL is auto-generated from the same directory as the library; pass `workerUrl` only when bundling requires it (e.g. `new URL('idb-refined/worker', import.meta.url)`).
 * @template T - Stored value shape (must include `id`). Omit for a generic client.
 */
export async function createIdb<T extends StoredValue = StoredValue>(
  options: IdbRefinedOptions,
  workerUrl?: string | URL
): Promise<IdbRefinedClient<T>> {
  const { dbName, ttlMs } = options;
  const storeName = options.storeName ?? DEFAULT_STORE_NAME;

  if (typeof Worker === "undefined") {
    return mainThreadClient<T>(dbName, storeName, ttlMs);
  }

  const url =
    workerUrl ??
    (typeof import.meta !== "undefined" && import.meta.url
      ? new URL("./worker.js", import.meta.url).href
      : undefined);
  if (url == null) {
    throw new Error(
      "createIdb: worker URL could not be resolved. Pass workerUrl (e.g. new URL('idb-refined/worker', import.meta.url)) when bundling."
    );
  }

  const worker = new Worker(url, { type: "module" });
  const pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  let nextId = 0;
  worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
    const data = e.data;
    const p = pending.get(data.id);
    if (p) {
      pending.delete(data.id);
      if ("error" in data && data.error) p.reject(new Error(data.error));
      else p.resolve(("result" in data ? data.result : undefined) as unknown);
    }
  };
  worker.onerror = (ev) => {
    for (const [, p] of pending)
      p.reject(ev.error ?? new Error("Worker error"));
    pending.clear();
  };

  const send = <R>(
    type: WorkerMessage["type"],
    payload?: unknown
  ): Promise<R> =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      worker.postMessage({ type, id, payload } as WorkerMessage);
    });

  await send<void>("init", { dbName, storeName, ttlMs });

  return {
    async set(value: T) {
      await send<void>("set", value);
    },
    async get(key: IDBValidKey) {
      return send<T | undefined>("get", key);
    },
    async update(key: IDBValidKey, value: Partial<T>) {
      await send<void>("update", { key, value });
    },
    async delete(key: IDBValidKey) {
      await send<void>("delete", key);
    },
    async deleteDb() {
      await send<void>("deleteDb");
    },
  };
}
