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

function log(msg: string): void {
  const out = document.getElementById("out");
  if (out) out.textContent += msg + "\n";
  console.log(msg);
}

async function run(): Promise<void> {
  const dbName = "idb-refined-example";
  const client = await createIdb<User>({ dbName });

  log("--- set ---");
  await client.set({ id: "1", name: "Alice", role: "admin" });
  await client.set({ id: "2", name: "Bob", role: "user" });
  log("Stored two items.");

  log("--- get ---");
  const one = await client.get("1");
  log("get('1'): " + JSON.stringify(one));

  log("--- getAll / keys / getMany ---");
  const all = await client.getAll();
  const keyList = await client.keys();
  const many = await client.getMany(["1", "2"]);
  log("getAll(): " + all.length + " items; keys(): " + JSON.stringify(keyList));
  log("getMany(['1','2']): " + JSON.stringify(many));

  log("--- update ---");
  await client.update("1", { name: "Alice Updated" });
  const updated = await client.get("1");
  log("After update get('1'): " + JSON.stringify(updated));
  if (updated) {
    log("  (merge preserved role: " + updated.role + ")");
  }

  log("--- delete ---");
  await client.delete("2");
  const two = await client.get("2");
  log("get('2') after delete: " + JSON.stringify(two));

  log("--- deleteDb ---");
  await client.deleteDb();
  log("Database removed. Done.");
}

run().catch((err) => {
  log("Error: " + String(err));
  console.error(err);
});
