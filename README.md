# idb-refined

Minimal IndexedDB client on top of [idb](https://www.npmjs.com/package/idb). Exposes **add**, **update**, **delete**, and **removeDb**. Init, schema, cleanup and eviction run automatically.

## Install

```bash
pnpm add idb-refined
# or
npm install idb-refined
```

## API

| Export | Purpose |
|--------|---------|
| **createClient(options)** | Returns `{ set, get, update, delete, deleteDb }`. Options: `dbName` (required), `storeName` (optional). |
| **set(value)** | Store a value. Value must have an `id` property. Expiry and eviction run automatically. |
| **get(key)** | Get a value by key. Returns `undefined` if not found. |
| **update(key, value)** | Update an existing entry by key. |
| **delete(key)** | Delete an entry by key. |
| **deleteDb()** | Close the DB and delete it from disk. |

For details, see **[Advanced documentation](docs/advanced.md)**.

## Example

```ts
import { createClient } from "idb-refined";

// Optional: type the stored value for set/get/update
type User = { id: string; name: string; createdAt?: number; expiresAt?: number };
const { set, get, update, delete: del, deleteDb } = createClient<User>({ dbName: "my-app" });

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

## License

MIT
