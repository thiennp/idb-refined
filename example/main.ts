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

const DB_NAME = "idb-refined-example";

function setStatus(msg: string, isError = false): void {
  const el = document.getElementById("status");
  if (el) {
    el.textContent = msg;
    el.style.color = isError ? "#c00" : "#666";
  }
}

function formatTime(ms: number | undefined): string {
  if (ms == null) return "—";
  const d = new Date(ms);
  return d.toLocaleString();
}

async function run(): Promise<void> {
  const client = await createIdb<User>({ dbName: DB_NAME });

  const inputId = document.getElementById("inputId") as HTMLInputElement;
  const inputName = document.getElementById("inputName") as HTMLInputElement;
  const inputRole = document.getElementById("inputRole") as HTMLInputElement;
  const tableBody = document.getElementById("tableBody")!;
  const btnAdd = document.getElementById("btnAdd")!;
  const btnRefresh = document.getElementById("btnRefresh")!;
  const btnDummy = document.getElementById("btnDummy")!;
  const btnDeleteDb = document.getElementById("btnDeleteDb")!;

  const DUMMY_USERS: User[] = [
    { id: "1", name: "Alice", role: "admin" },
    { id: "2", name: "Bob", role: "user" },
    { id: "3", name: "Charlie", role: "editor" },
    { id: "4", name: "Diana", role: "user" },
    { id: "5", name: "Eve", role: "admin" },
  ];

  async function renderTable(): Promise<void> {
    const rows = await client.getAll();
    tableBody.innerHTML = "";
    if (rows.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="6" class="empty">No items. Add one above.</td></tr>';
      return;
    }
    for (const row of rows) {
      const tr = document.createElement("tr");
      const id = String(row.id);
      tr.innerHTML = `
        <td>${escapeHtml(id)}</td>
        <td>${escapeHtml(String(row.name ?? ""))}</td>
        <td>${escapeHtml(String(row.role ?? ""))}</td>
        <td>${formatTime(row.createdAt)}</td>
        <td>${formatTime(row.expiresAt)}</td>
        <td class="actions">
          <button type="button" class="delete" data-delete="${escapeAttr(id)}">Delete</button>
        </td>
      `;
      tr.querySelector("[data-delete]")?.addEventListener("click", async () => {
        await client.delete(id);
        setStatus("Deleted " + id);
        await renderTable();
      });
      tableBody.appendChild(tr);
    }
  }

  btnAdd.addEventListener("click", async () => {
    const id = inputId.value.trim();
    const name = inputName.value.trim();
    const role = inputRole.value.trim();
    if (!id) {
      setStatus("Enter an id.", true);
      return;
    }
    try {
      await client.set({ id, name, role });
      setStatus("Added " + id);
      inputId.value = "";
      inputName.value = "";
      inputRole.value = "";
      await renderTable();
    } catch (e) {
      setStatus("Error: " + String(e), true);
    }
  });

  btnRefresh.addEventListener("click", async () => {
    setStatus("Refreshing…");
    await renderTable();
    setStatus("");
  });

  btnDummy.addEventListener("click", async () => {
    try {
      setStatus("Adding dummy data…");
      for (const user of DUMMY_USERS) {
        await client.set(user);
      }
      setStatus(`Added ${DUMMY_USERS.length} dummy items.`);
      await renderTable();
    } catch (e) {
      setStatus("Error: " + String(e), true);
    }
  });

  btnDeleteDb.addEventListener("click", async () => {
    if (!confirm("Delete the whole database? This cannot be undone.")) return;
    await client.deleteDb();
    setStatus("Database deleted.");
    await renderTable();
  });

  await renderTable();
  setStatus("");
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;");
}

run().catch((err) => {
  setStatus("Error: " + String(err), true);
  console.error(err);
});
