# idb-refined

Minimal IndexedDB client on top of [idb](https://www.npmjs.com/package/idb). Exposes **set**, **get**, **update**, **delete**, and **deleteDb**. Init, schema, cleanup and eviction run automatically. See [CHANGELOG.md](CHANGELOG.md) for version history.

## Install

```bash
pnpm add idb-refined
# or
npm install idb-refined
```

**Try the example:** [Live](https://thiennp.github.io/idb-refined/) · [Source](example/)

## When to use

Good for: key-value cache with TTL and eviction, offline storage, simple app storage by id. Not for: complex multi-index queries or raw IDB transactions—use [idb](https://www.npmjs.com/package/idb) or native IndexedDB instead.

## API

| Export | Purpose |
|--------|---------|
| **createIdb(options, workerUrl?)** | Returns a Promise of `{ set, get, getAll, keys, getMany, update, delete, deleteDb }`. Uses a Web Worker by default (browser); worker URL is auto-generated. Options: `dbName` (required), `storeName` (optional), `ttlMs` (optional, default 3600000), `maxCount` (optional, default 1000). Pass `workerUrl` only when bundling requires it. |
| **set(value)** | Store a value. Value must have an `id` property. The object is not mutated; expiry and eviction run automatically. |
| **get(key)** | Get a value by key. Returns `undefined` if not found. |
| **getAll()** | Get all values in the store. |
| **keys()** | Get all keys in the store. |
| **getMany(keys)** | Get values for multiple keys; returns array aligned with input (undefined where missing). |
| **update(key, value)** | Merge partial fields into the existing entry by key (other fields preserved). |
| **delete(key)** | Delete an entry by key. |
| **deleteDb()** | Close the DB and delete it from disk. |

For details, see **[Advanced documentation](docs/advanced.md)**. Run the **[example](example/)** locally (`pnpm example`) or try the **[live playground](https://thiennp.github.io/idb-refined/)** (deployed from `main` via [GitHub Actions](.github/workflows/deploy-example.yml)). The `idb-refined/worker` export is a script entry for the Worker constructor only (no types).

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

## Bundling

With Vite or Webpack the worker URL may not resolve; pass `workerUrl` explicitly:

**Vite:**

```ts
const client = await createIdb(
  { dbName: "my-app" },
  new URL("idb-refined/worker", import.meta.url)
);
```

**Webpack 5:** Use a path that resolves to the worker script (e.g. `new URL("./node_modules/idb-refined/dist/worker.js", import.meta.url)` or configure your bundler to expose it). See [Bundling](docs/advanced.md#bundling) in the advanced docs.

## Requirements

- Values must include an `id` property (used as the store key).
- The library uses a single store (default name `"store"`) with indexes on `expiresAt` and `createdAt`. Cleanup and eviction run on set.
- **Environment:** Requires IndexedDB (and Web Workers in the browser for worker mode). Works in modern browsers; tests use fake-indexeddb in Node.

## Under the hood

- **Schema & versioning** — A single store (and indexes on `expiresAt`, `createdAt`) is created or upgraded automatically; version bumps are derived from a schema fingerprint so you don’t manage versions by hand.
- **Cleanup** — Expired entries (`expiresAt` in the past) are removed before and after each `set`, so TTL “just works” and there’s room to add.
- **Eviction** — If the store is at or over `maxCount` (default 1000), the oldest entries by `createdAt` are evicted *before* the add, then again after if needed, so the store stays under the cap and adds don’t run out of space.
- **Web Worker** — `createIdb` runs all of the above (schema, cleanup, eviction, put/get/update/delete) inside a Web Worker by default. The worker URL is auto-generated; the main thread only sends messages and receives results, so heavy I/O and bookkeeping stay off the UI thread.

## Releasing

1. Bump version: `pnpm version patch` (or `minor` / `major`).
2. Commit and push: `git push && git push --tags`.
3. Pushing a tag matching `v*` triggers the [Publish to npm](.github/workflows/publish.yml) workflow.

**Required:** Add an `NPM_TOKEN` secret in the repo (Settings → Secrets and variables → Actions).

**Playground:** To publish the example to GitHub Pages, enable Pages in the repo (Settings → Pages → Source: **GitHub Actions**). Each push to `main` will build and deploy the example to `https://<username>.github.io/idb-refined/`.

## Feedback

We’d love to hear from you—bug reports, ideas, or questions. Reach out via [email](mailto:nguyenphongthien@gmail.com), [LinkedIn](https://linkedin.com/in/thiennp), or [GitHub issues/discussions](https://github.com/thiennp/idb-refined).

## License

MIT
