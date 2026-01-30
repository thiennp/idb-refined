# Advanced documentation

Details for **idb-refined** and its single export: **createIdb**.

---

## Type-safe usage

Pass a generic to `createIdb<T>` so `set`, `get`, and `update` use your value shape:

```ts
type Item = { id: string; name: string; createdAt?: number; expiresAt?: number };
const client = await createIdb<Item>({ dbName: "my-db" });
await client.set({ id: "1", name: "x" });
const item = await client.get("1"); // Item | undefined
await client.update("1", { name: "y" });
```

`T` must extend `StoredValue` (i.e. have an `id` property). You can import `StoredValue` from the package if needed.

---

## createIdb(options, workerUrl?)

Creates a client bound to a database. Uses a Web Worker by default (browser); worker URL is auto-generated. Init, schema, cleanup and eviction are handled internally.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `options.dbName` | `string` | Yes | Database name. |
| `options.storeName` | `string` | No | Object store name. Omitted, `"store"` is used. |
| `options.ttlMs` | `number` | No | Default TTL in ms for values without `expiresAt`. Omitted, 3600000 (1 hour) is used. |
| `options.maxCount` | `number` | No | Max entries before eviction. Omitted, 1000 is used. |
| `workerUrl` | `string \| URL` | No | Worker script URL. Omitted, resolved from same directory as the library; pass when bundling (e.g. `new URL('idb-refined/worker', import.meta.url)`). The `idb-refined/worker` subpath is a script entry only (for the Worker constructor), not for importing types. |

**Returns:** `Promise<IdbRefinedClient<T>>`, i.e. `{ set, get, update, delete, deleteDb }`. When a generic is passed, methods are typed accordingly.

**Internal behavior:**

- DB is opened with a default schema: one store (keyPath `"id"`), indexes on `expiresAt` and `createdAt`. Multiple stores per DB are supported when using different `storeName` values with the same `dbName`.
- Version is auto-detected from the schema (no manual version).
- Connection is cached per `dbName`.

---

## set(value)

Stores a value. Cleanup and eviction run after each set. **The object you pass is not mutated;** the client clones it before adding `createdAt`/`expiresAt` and storing.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `value` | `T` | Yes | Object to store. Must have an `id` property. When using `createIdb<T>`, must match `T`. |

**Behavior:**

- Clones the value and sets `createdAt` and `expiresAt` on the copy if missing (`expiresAt` = now + `ttlMs` from options, default 1 hour).
- Puts the copy into the store.
- If store count exceeds `maxCount` (default 1000), evicts oldest entries by `createdAt`.
- Deletes entries where `expiresAt` &lt; now.

**Reference:** Built on [idb](https://www.npmjs.com/package/idb). IndexedDB [object store](https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore).

---

## get(key)

Returns the value for the given key, or `undefined` if not found.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | `IDBValidKey` | Yes | Key of the entry to get. |

**Returns:** `Promise<T | undefined>`. When using `createIdb<T>`, the result is typed as `T`.

**Reference:** [IDBObjectStore.get](https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/get).

---

## update(key, value)

Merges the given fields into the existing entry. **Other fields on the record are preserved.** If no entry exists for the key, the result is the partial plus `id: key`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | `IDBValidKey` | Yes | Key of the entry to update. |
| `value` | `Partial<T>` | Yes | Fields to merge. The client reads the existing record, shallow-merges `value` and `id: key`, then puts. When using `createIdb<T>`, partial of `T`. |

**Reference:** Implemented as get + merge + put; existing fields (e.g. `createdAt`, `expiresAt`) are kept unless overridden in `value`.

---

## delete(key)

Deletes the entry with the given key.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | `IDBValidKey` | Yes | Key of the entry to delete. |

**Reference:** [IDBObjectStore.delete](https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/delete).

---

## deleteDb()

Closes the cached connection (if any) and deletes the database from disk.

**Reference:** [indexedDB.deleteDatabase](https://developer.mozilla.org/en-US/docs/Web/API/IDBFactory/deleteDatabase).

---

## Use cases

- **Simple key-value cache:** `await createIdb({ dbName, ttlMs, maxCount })` then `set` / `get` / `update` / `delete`. Expiry and size cap (default 1000 entries) are automatic.
- **App storage:** One DB per app; set/get/update/delete by id; call `deleteDb` to wipe (e.g. logout).

---

## References

- [idb](https://www.npmjs.com/package/idb) – Promise wrapper for IndexedDB.
- [MDN: Using IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB).
