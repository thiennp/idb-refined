# idb-refined

Thin TypeScript IndexedDB helper on top of [idb](https://www.npmjs.com/package/idb): init DB with auto-version, clean by date or size, add with eviction, and delete helpers.

## Install

```bash
pnpm add idb-refined
# or
npm install idb-refined
```

## API

| Function | Purpose |
|----------|---------|
| **initDb(name, options?)** | Open or create a DB. Version is auto-detected when you pass a declarative `schema`; optional manual `version` + `upgrade`. Returns idb’s `IDBPDatabase`. |
| **cleanOldEntries(db, storeName, options)** | Delete entries where `dateKey` &lt; `before` (timestamp ms). Options: `{ dateKey, before }`. Requires an index on `dateKey`. |
| **cleanWhenTooLarge(db, storeName, options)** | Evict oldest entries (by `dateKey`) until count ≤ `maxCount`. Options: `{ dateKey, maxCount }`. Returns count deleted. |
| **putWithEviction(db, storeName, value, options)** | Put value, then if store count &gt; `maxCount` evict oldest by `dateKey`. Options: `{ key?, dateKey, maxCount }`. |
| **deleteByKey(db, storeName, key)** | Delete a single entry by key. |
| **clearStore(db, storeName)** | Delete all entries in a store. |
| **deleteDB(name)** | Re-export of idb’s `deleteDB`. |

## Use cases

- **Cache with TTL:** initDb, put items with `expiresAt`, call `cleanOldEntries` on startup or interval.
- **Cache with max size:** Use `putWithEviction` or call `cleanWhenTooLarge` after adding.
- **Cache with TTL + max size:** `putWithEviction` + periodic `cleanOldEntries` for expired.
- **Log / event buffer:** `putWithEviction` with `dateKey: 'createdAt'` and `maxCount`.
- **Simple key-value:** initDb, `db.get` / `db.put` / `deleteByKey`; optional cleanup when too large.

## Examples

### Cache with TTL and max size

```ts
import { initDb, putWithEviction, cleanOldEntries, deleteByKey } from "idb-refined";

const db = await initDb("my-cache", {
  schema: {
    stores: {
      cache: { keyPath: "id", indexes: ["expiresAt"] },
    },
  },
});

// Add item; if store has more than 1000 entries, evict oldest
await putWithEviction(
  db,
  "cache",
  { id: "k1", data: "v1", expiresAt: Date.now() + 3600 },
  { dateKey: "expiresAt", maxCount: 1000 }
);

// Periodic: remove expired
await cleanOldEntries(db, "cache", {
  dateKey: "expiresAt",
  before: Date.now(),
});

// Delete one
await deleteByKey(db, "cache", "k1");
```

### Log buffer (cap size)

```ts
await putWithEviction(
  db,
  "logs",
  { id: generateId(), message, createdAt: Date.now() },
  { dateKey: "createdAt", maxCount: 5000 }
);
```

### Manual cleanup when too large

```ts
const deleted = await cleanWhenTooLarge(db, "cache", {
  dateKey: "expiresAt",
  maxCount: 500,
});
console.log(`Evicted ${deleted} entries`);
```

## Requirements

- Stores that use `cleanOldEntries`, `cleanWhenTooLarge`, or `putWithEviction` must have an **index** on the date field (e.g. `expiresAt`, `createdAt`). Define it in your schema:

  ```ts
  schema: {
    stores: {
      cache: { keyPath: "id", indexes: ["expiresAt"] },
    },
  }
  ```

- Eviction is **count-based** only (no byte-size or quota check).

## License

MIT
