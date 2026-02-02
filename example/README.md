# Example

Browser example for **idb-refined**.

**Try it without cloning:** [Live example](https://thiennp.github.io/idb-refined/)

From repo root you can run `pnpm example` to build and open the example in the browser.

## Run

1. Build the library from the project root:

   ```bash
   pnpm build
   ```

2. Serve the project (import maps need a real origin):

   ```bash
   npx serve .
   ```

3. Open [http://localhost:3000/example/](http://localhost:3000/example/) and open the browser console to see the demo output.

The example runs `set`, `get`, `getAll`, `update`, `delete`, and `deleteDb` against a database named `idb-refined-example`.

## Viewing data in IndexedDB

To inspect the stored data: open DevTools (F12) → **Application** tab (Chrome/Edge) or **Storage** tab (Firefox) → **IndexedDB** → expand your origin → open **idb-refined-example** → open the **store** object store to see keys and values.
