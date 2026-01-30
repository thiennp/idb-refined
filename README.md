# idb-refined

Minimal IndexedDB client on top of [idb](https://www.npmjs.com/package/idb). Exposes **set**, **get**, **update**, **delete**, and **deleteDb**. Init, schema, cleanup and eviction run automatically.

## Install

```bash
pnpm add idb-refined
# or
npm install idb-refined
```

## API

| Export | Purpose |
|--------|---------|
| **createIdb(options, workerUrl?)** | Returns a Promise of `{ set, get, update, delete, deleteDb }`. Uses a Web Worker by default (browser); worker URL is auto-generated. Options: `dbName` (required), `storeName` (optional), `ttlMs` (optional, default 3600000), `maxCount` (optional, default 1000). Pass `workerUrl` only when bundling requires it. |
| **set(value)** | Store a value. Value must have an `id` property. The object is not mutated; expiry and eviction run automatically. |
| **get(key)** | Get a value by key. Returns `undefined` if not found. |
| **update(key, value)** | Merge partial fields into the existing entry by key (other fields preserved). |
| **delete(key)** | Delete an entry by key. |
| **deleteDb()** | Close the DB and delete it from disk. |

For details, see **[Advanced documentation](docs/advanced.md)**. Run the **[example](example/)** in the browser (see `example/README.md`). The `idb-refined/worker` export is a script entry for the Worker constructor only (no types).

## Example

```ts
import { createIdb } from "idb-refined";

// Optional: type the stored value for set/get/update
type User = { id: string; name: string; createdAt?: number; expiresAt?: number };
const { set, get, update, delete: del, deleteDb } = await createIdb<User>({
  dbName: "my-app",
  ttlMs: 3600_000, // optional: 1 hour default TTL
});

await set({ id: "1", name: "Alice" });
const value = await get("1"); // User | undefined
await update("1", { name: "Alice Updated" });
await del("1");
await deleteDb();
```

## Requirements

- Values must include an `id` property (used as the store key).
- The library uses a single store (default name `"store"`) with indexes on `expiresAt` and `createdAt`. Cleanup and eviction run on set.

## Releasing

1. Bump version: `pnpm version patch` (or `minor` / `major`).
2. Commit and push: `git push && git push --tags`.
3. Pushing a tag matching `v*` triggers the [Publish to npm](.github/workflows/publish.yml) workflow.

**Required:** Add an `NPM_TOKEN` secret in the repo (Settings → Secrets and variables → Actions).

## Under the hood

- **Schema & versioning** — A single store (and indexes on `expiresAt`, `createdAt`) is created or upgraded automatically; version bumps are derived from a schema fingerprint so you don’t manage versions by hand.
- **Cleanup** — Expired entries (`expiresAt` in the past) are removed before and after each `set`, so TTL “just works” and there’s room to add.
- **Eviction** — If the store is at or over `maxCount` (default 1000), the oldest entries by `createdAt` are evicted *before* the add, then again after if needed, so the store stays under the cap and adds don’t run out of space.
- **Web Worker** — `createIdb` runs all of the above (schema, cleanup, eviction, put/get/update/delete) inside a Web Worker by default. The worker URL is auto-generated; the main thread only sends messages and receives results, so heavy I/O and bookkeeping stay off the UI thread.

## License

MIT
