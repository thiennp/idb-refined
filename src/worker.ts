/**
 * Web Worker entry: runs init, cleanup, eviction, and all DB operations off the main thread.
 * Message protocol: { type, id, payload } -> { id, result? | error? }
 */
import {
  executeDelete,
  executeDeleteDb,
  executeGet,
  executeGetAll,
  executeGetMany,
  executeKeys,
  executeSet,
  executeUpdate,
  getDb,
} from "./clientCore.js";
import type { WorkerMessage, WorkerResponse } from "./workerProtocol.js";

let dbName: string;
let storeName: string;
let ttlMs: number | undefined;
let maxCount: number | undefined;

function respond(id: number, result?: unknown, error?: string): void {
  const msg: WorkerResponse = error != null ? { id, error } : { id, result };
  self.postMessage(msg);
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, id, payload } = e.data;
  try {
    switch (type) {
      case "init": {
        const {
          dbName: dn,
          storeName: sn,
          ttlMs: ttl,
          maxCount: max,
        } = payload as {
          dbName: string;
          storeName: string;
          ttlMs?: number;
          maxCount?: number;
        };
        dbName = dn;
        storeName = sn;
        ttlMs = ttl;
        maxCount = max;
        await getDb(dbName, storeName);
        respond(id);
        break;
      }
      case "set":
        await executeSet(
          dbName,
          storeName,
          payload as Record<string, unknown>,
          {
            ttlMs,
            maxCount,
          }
        );
        respond(id);
        break;
      case "get": {
        const value = await executeGet(
          dbName,
          storeName,
          payload as IDBValidKey
        );
        respond(id, value);
        break;
      }
      case "getAll": {
        const values = await executeGetAll(dbName, storeName);
        respond(id, values);
        break;
      }
      case "keys": {
        const keysResult = await executeKeys(dbName, storeName);
        respond(id, keysResult);
        break;
      }
      case "getMany": {
        const values = await executeGetMany(
          dbName,
          storeName,
          payload as IDBValidKey[]
        );
        respond(id, values);
        break;
      }
      case "update": {
        const { key, value } = payload as {
          key: IDBValidKey;
          value: Record<string, unknown>;
        };
        await executeUpdate(dbName, storeName, key, value);
        respond(id);
        break;
      }
      case "delete":
        await executeDelete(dbName, storeName, payload as IDBValidKey);
        respond(id);
        break;
      case "deleteDb":
        await executeDeleteDb(dbName);
        respond(id);
        break;
      default:
        respond(id, undefined, `Unknown message type: ${type}`);
    }
  } catch (err) {
    respond(id, undefined, err instanceof Error ? err.message : String(err));
  }
};
