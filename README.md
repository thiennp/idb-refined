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
| **initDb(name, options?)** | Open or create a DB. Version is auto-detected when you pass a declarative `schema`; or use manual `version` and `upgrade`. Returns idb’s `IDBPDatabase`. |
| **cleanOldEntries(db, storeName, options)** | Delete entries where `dateKey` &lt; `before` (timestamp ms). Requires an index on `dateKey`. |
| **cleanWhenTooLarge(db, storeName, options)** | Evict oldest entries (by `dateKey`) until count ≤ `maxCount`. Returns count deleted. Requires an index on `dateKey`. `maxCount` is optional. |
| **putWithEviction(db, storeName, value, options)** | Put value, then if store count &gt; `maxCount` evict oldest by `dateKey`. Options may include `expiresAt` (ms), `ttlSeconds` (seconds), and optional `maxCount`. |
| **deleteByKey(db, storeName, key)** | Delete a single entry by key. |
| **clearStore(db, storeName)** | Delete all entries in a store. |
| **deleteDB(name)** | Re-export of idb’s `deleteDB`. |

For parameter details, behavior, and use-case explanations, see **[Advanced documentation](docs/advanced.md)**.

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

await putWithEviction(db, "cache", { id: "k1", data: "v1" }, {
  dateKey: "expiresAt",
  maxCount: 1000,
  ttlSeconds: 3600,
});

await cleanOldEntries(db, "cache", { dateKey: "expiresAt", before: Date.now() });
await deleteByKey(db, "cache", "k1");
```

### Log buffer

```ts
await putWithEviction(db, "logs", { id: generateId(), message }, {
  dateKey: "createdAt",
  maxCount: 5000,
});
```

### Manual eviction

```ts
const deleted = await cleanWhenTooLarge(db, "cache", { dateKey: "expiresAt", maxCount: 500 });
console.log(`Evicted ${deleted} entries`);
```

## Requirements

- Stores used with `cleanOldEntries`, `cleanWhenTooLarge`, or `putWithEviction` must have an **index** on the date field (e.g. `expiresAt`, `createdAt`). Define it in your schema.
- Eviction is **count-based** only (no byte-size or quota check).

## Releasing

1. Bump version: `pnpm version patch` (or `minor` / `major`).
2. Commit and push: `git push && git push --tags`.
3. Pushing a tag matching `v*` (e.g. `v0.0.2`) triggers the [Publish to npm](.github/workflows/publish.yml) workflow, which runs build and `pnpm publish`.

**Required:** Add an `NPM_TOKEN` secret in the repo (Settings → Secrets and variables → Actions). Use an npm [access token](https://www.npmjs.com/settings/~/tokens) or granular token with publish permission.

## License

MIT
