# Advanced documentation

Parameter details, behavior, use-case explanations, and references for **idb-refined**.

---

## API reference

### initDb(name, options?)

Opens or creates an IndexedDB database. Returns a Promise of idb’s enhanced `IDBPDatabase`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | `string` | Yes | Database name. |
| `options.schema` | `SchemaDef` | No | Declarative schema; version is derived from a fingerprint. When provided, `version` and `upgrade` are not used for initial schema creation. |
| `options.version` | `number` | No | Used only when `schema` is not provided. Omitted, the library uses version `1` when opening without a schema. |
| `options.upgrade` | `(db: IDBPDatabase) => void` | No | Run when opening with an explicit `version` (no `schema`), or after schema application when both `schema` and `upgrade` are provided. |

**Schema (`SchemaDef`):** `{ stores: Record<string, StoreDef> }`. Each `StoreDef`: `keyPath?`, `autoIncrement?`, `indexes?` (array of index names, or record `indexName → keyPath`).

**Behavior:**

- With `schema`: Version is computed from a fingerprint; a meta DB stores the last version per name. Schema changes trigger an upgrade and updated meta.
- With `version` (and optionally `upgrade`) only: Opens with that version; `upgrade` runs when the opened version is greater than the current one.
- With neither `schema` nor `version`: Opens with version `1` and no upgrade.

**Reference:** Built on [idb](https://www.npmjs.com/package/idb) `openDB`. See [IndexedDB: Opening a database (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB#opening_a_database).

---

### cleanOldEntries(db, storeName, options)

Deletes every entry in `storeName` whose field `options.dateKey` is strictly less than `options.before` (numeric timestamp, e.g. ms).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `db` | `IDBPDatabase` | Yes | Opened database (e.g. from `initDb`). |
| `storeName` | `string` | Yes | Object store name. |
| `options.dateKey` | `string` | Yes | Property name used as date/timestamp (must have an index). |
| `options.before` | `number` | Yes | Upper bound (exclusive). Entries with `dateKey < before` are deleted. |

**Requirement:** The store must have an index on `options.dateKey` (create it in your schema or in an `upgrade` callback).

**Use when:** Expiring cache entries (TTL), pruning old logs, or any “delete older than” logic. Call on startup, on an interval, or when the app becomes visible.

**Reference:** Uses `IDBKeyRange.upperBound(before, true)` and index range deletes. [IDBKeyRange (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/IDBKeyRange).

---

### cleanWhenTooLarge(db, storeName, options)

Evicts the **oldest** entries (by `options.dateKey`) until the store’s count is ≤ `options.maxCount`. Returns the number of entries deleted.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `db` | `IDBPDatabase` | Yes | Opened database. |
| `storeName` | `string` | Yes | Object store name. |
| `options.dateKey` | `string` | Yes | Property used to order “oldest first”; must have an index. |
| `options.maxCount` | `number` | No | Target maximum number of entries after eviction. Omitted, 1000 is used. |

**Requirement:** The store must have an index on `options.dateKey`.

**Behavior:** Reads current count; if count ≤ `maxCount` (or 1000 when omitted), returns `0`. Otherwise opens a cursor on the index (ascending), collects primary keys of the oldest `count - maxCount` entries, then deletes them in one transaction.

**Use when:** Capping cache size, log buffer size, or offline queue length.

**Reference:** [IDBIndex.openKeyCursor (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/IDBIndex/openKeyCursor).

---

### putWithEviction(db, storeName, value, options)

Puts `value` into `storeName`, then if the store’s count is greater than `options.maxCount`, runs the same eviction logic as `cleanWhenTooLarge` (oldest by `options.dateKey`). Optionally sets the date field on the value from `expiresAt` (absolute ms) or `ttlSeconds` (relative seconds).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `db` | `IDBPDatabase` | Yes | Opened database. |
| `storeName` | `string` | Yes | Object store name. |
| `value` | `T` | Yes | Value to store. If the store has a `keyPath`, `value` must include that property; otherwise pass `options.key`. When `value` is an object, `dateKey` is set from `expiresAt` or `ttlSeconds` if provided. |
| `options.key` | `IDBValidKey` | No | Out-of-line key when the store has no `keyPath`. |
| `options.dateKey` | `string` | Yes | Property used for “oldest first” eviction and for expiry; must have an index. |
| `options.maxCount` | `number` | No | After put, evict until count ≤ this. Omitted, 1000 is used. |
| `options.expiresAt` | `number` | No | Absolute expiry timestamp (ms). If set, `value[dateKey]` is set to this before put. |
| `options.ttlSeconds` | `number` | No | Relative expiry in seconds. If `expiresAt` is not set, `value[dateKey]` is set to `now + ttlSeconds * 1000`. When neither `expiresAt` nor `ttlSeconds` is provided, `ttlSeconds` is treated as 3600 (1 hour). |

**Requirement:** The store must have an index on `options.dateKey`.

**Behavior:** When `value` is an object: if `expiresAt` is provided, set `value[dateKey] = expiresAt`; otherwise set `value[dateKey] = Date.now() + (ttlSeconds ?? 3600) * 1000`. Then put and, if count > `maxCount` (or 1000 when omitted), evict as above.

**Use when:** Adding a single item and immediately enforcing a size cap, with optional expiry (absolute or relative).

**Reference:** Same eviction semantics as `cleanWhenTooLarge`; put is done via idb’s `db.put`.

---

### deleteByKey(db, storeName, key)

Deletes the single entry in `storeName` with the given key.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `db` | `IDBPDatabase` | Yes | Opened database. |
| `storeName` | `string` | Yes | Object store name. |
| `key` | `IDBValidKey` | Yes | Key of the entry to delete. |

**Reference:** Wrapper around idb’s `db.delete(storeName, key)`. [IDBObjectStore.delete (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/delete).

---

### clearStore(db, storeName)

Deletes all entries in `storeName`. The store and its indexes remain.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `db` | `IDBPDatabase` | Yes | Opened database. |
| `storeName` | `string` | Yes | Object store name. |

**Reference:** Wrapper around idb’s `db.clear(storeName)`. [IDBObjectStore.clear (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/clear).

---

### deleteDB(name)

Deletes the database with the given name. All connections must be closed first (or they will get a `versionchange` event).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | `string` | Yes | Database name. |

**Reference:** Re-exported from [idb](https://www.npmjs.com/package/idb) `deleteDB`. [indexedDB.deleteDatabase (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/IDBFactory/deleteDatabase).

---

## Use cases (detailed)

### 1. Cache with TTL (time-to-live)

**Goal:** Store items that expire after a fixed time (e.g. API responses, session data).

**Approach:**

- Use a store with a keyPath (e.g. `id`) and an index on a timestamp field (e.g. `expiresAt`).
- On write: set `expiresAt = Date.now() + ttlMs`.
- On read: use `db.get`; optionally treat missing or expired entries as cache miss.
- Cleanup: call `cleanOldEntries(db, storeName, { dateKey: "expiresAt", before: Date.now() })` on startup, on an interval, or when the tab becomes visible.

**Why an index:** `cleanOldEntries` uses a range on the date field; an index makes that efficient.

**Reference:** [Stale-while-revalidate](https://web.dev/stale-while-revalidate/) (web.dev); IndexedDB is one possible backend for a cache.

---

### 2. Cache with max size (count cap)

**Goal:** Limit how many items are kept (e.g. last N search results, last N images).

**Approach:**

- Use a store with an index on a “time” or “order” field (e.g. `createdAt`).
- On add: use `putWithEviction(db, storeName, value, { dateKey: "createdAt", maxCount: N })` so each add may evict the oldest entries.
- Or: add with `db.put`, then call `cleanWhenTooLarge(db, storeName, { dateKey: "createdAt", maxCount: N })` when you want to trim.

**Eviction order:** Oldest by `dateKey` (ascending index) is evicted first.

---

### 3. Cache with TTL and max size

**Goal:** Both expiration and a cap (e.g. API cache: expire after 1 hour and keep at most 1000 entries).

**Approach:**

- One store with both `expiresAt` and `createdAt` (or a single field for “age”), and indexes on both.
- Add with `putWithEviction(..., { dateKey: "createdAt", maxCount: 1000 })` to enforce size.
- Periodically run `cleanOldEntries(..., { dateKey: "expiresAt", before: Date.now() })` to remove expired entries.

You can use the same field (e.g. `createdAt`) for eviction and derive “expired” by another field or by a separate TTL field.

---

### 4. Log / event buffer

**Goal:** Append logs or events and keep only the most recent N (e.g. last 5000 events for debugging or sync).

**Approach:**

- Store: keyPath `id` (or autoIncrement), index on `createdAt` (or `timestamp`).
- Append: `putWithEviction(db, "logs", { id: generateId(), message, createdAt: Date.now() }, { dateKey: "createdAt", maxCount: 5000 })`.
- Read: use `db.getAll`, or iterate with a cursor; optionally use the index for range queries.

**Reference:** Similar to circular buffers or bounded queues; IndexedDB gives persistence across reloads.

---

### 5. Offline queue (sync later)

**Goal:** Queue actions or payloads while offline, then sync and remove after success.

**Approach:**

- Store: e.g. keyPath `id`, index on `createdAt` if you want ordering or eviction.
- Add: `db.add` or `db.put`; optionally cap size with `putWithEviction` and `dateKey`/`maxCount`.
- Sync: process entries (e.g. by cursor or `getAll`), send to server, then `deleteByKey(db, storeName, id)` for each synced item.
- Clear after full sync: `clearStore(db, storeName)` if you prefer to wipe the queue.

**Reference:** [Background sync (web.dev)](https://web.dev/background-sync/); IndexedDB is often used to hold the queue.

---

### 6. Simple key-value store

**Goal:** Persistent key-value storage (like localStorage but async and larger).

**Approach:**

- Store: no keyPath (out-of-line keys) or keyPath e.g. `id`.
- Get: `db.get(storeName, key)`.
- Set: `db.put(storeName, value, key)` (or with keyPath in `value`).
- Delete: `deleteByKey(db, storeName, key)`.
- Optional: add a date index and use `cleanWhenTooLarge` or `cleanOldEntries` to limit size or age.

**Reference:** [idb keyval example](https://github.com/jakearchibald/idb#keyval-store); idb-refined’s `initDb` returns the same kind of enhanced DB as idb’s `openDB`.

---

## References

- **idb** – [npm](https://www.npmjs.com/package/idb), [GitHub](https://github.com/jakearchibald/idb): Promise wrapper and helpers for IndexedDB.
- **IndexedDB API** – [MDN: Using IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB), [MDN: IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API).
- **IDBKeyRange** – [MDN](https://developer.mozilla.org/en-US/docs/Web/API/IDBKeyRange): range queries for keys.
- **Storage quotas** – [StorageManager](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager), [storage.estimate()](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate): quota and usage; idb-refined does not use these (eviction is count-based only).
