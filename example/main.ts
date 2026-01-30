/**
 * Example: using idb-refined in the browser (TypeScript).
 * Run: pnpm example
 */
import { createIdb } from "idb-refined";

type User = {
  id: string;
  name: string;
  role: string;
  createdAt?: number;
  expiresAt?: number;
};

async function run(): Promise<void> {
  const dbName = "idb-refined-example";
  const client = await createIdb<User>({ dbName });

  console.log("--- set ---");
  await client.set({ id: "1", name: "Alice", role: "admin" });
  await client.set({ id: "2", name: "Bob", role: "user" });
  console.log("Stored two items.");

  console.log("--- get ---");
  const one = await client.get("1");
  console.log("get('1'):", one);

  console.log("--- update ---");
  await client.update("1", { name: "Alice Updated" });
  const updated = await client.get("1");
  console.log("After update get('1'):", updated);
  // update() merges: other fields (role, createdAt, expiresAt) are preserved
  if (updated) {
    console.log(
      "  (merge preserved role:",
      updated.role,
      "; id/name/createdAt/expiresAt all present)"
    );
  }

  console.log("--- delete ---");
  await client.delete("2");
  const two = await client.get("2");
  console.log("get('2') after delete:", two);

  console.log("--- deleteDb ---");
  await client.deleteDb();
  console.log("Database removed. Done.");
}

run().catch(console.error);
