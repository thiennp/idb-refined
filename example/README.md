# Example

Browser example for **idb-refined**.

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

The example runs `set`, `get`, `update`, `delete`, and `deleteDb` against a temporary database.
