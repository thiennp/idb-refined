export type WorkerMessage =
  | {
      type: "init";
      id: number;
      payload: {
        dbName: string;
        storeName: string;
        ttlMs?: number;
        maxCount?: number;
      };
    }
  | { type: "set"; id: number; payload: unknown }
  | { type: "get"; id: number; payload: IDBValidKey }
  | { type: "getAll"; id: number; payload?: undefined }
  | { type: "keys"; id: number; payload?: undefined }
  | { type: "getMany"; id: number; payload: IDBValidKey[] }
  | {
      type: "update";
      id: number;
      payload: { key: IDBValidKey; value: unknown };
    }
  | { type: "delete"; id: number; payload: IDBValidKey }
  | { type: "deleteDb"; id: number; payload?: undefined };

export type WorkerResponse =
  | { id: number; result: unknown }
  | { id: number; error: string };
