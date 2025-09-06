import React, { useMemo, useState } from "react";
import { useSheet, writeRow } from "../../lib/sheetsApi";
import { mapTenders } from "../../lib/adapters";

// Adjust if your sheet name or key differs
const SHEET = "tenders";

function TenderManagementPage() {
  // Pull data from Google Sheet using the mapTenders adapter
  const { rows, loading, error } = useSheet(SHEET, mapTenders);

  // Local UI state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Basic filtering and sorting
  const filtered = useMemo(() => {
    let list = rows || [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) => (r.tenderId || "").toLowerCase().includes(q) || (r.title || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      list = list.filter((r) => (r.status || "") === statusFilter);
    }
    return list;
  }, [rows, search, statusFilter]);

  // Handler for create/edit (use writeRow with { action: 'create' | 'update' })
  async function handleSave(payload) {
    try {
      await writeRow(SHEET, payload.id ? "update" : "create", {
        tender_id: payload.tenderId,
        title: payload.title,
        status: payload.status,
        products_count: payload.productsCount ?? 0,
        delivery_date: payload.deliveryDate || null,
        stock_coverage_days: payload.stockCoverage ?? null,
        total_value_clp: payload.totalValue ?? null,
        created_date: payload.createdDate,
      });
      window.location.reload();
    } catch (err) {
      alert("Error saving: " + (err?.message || String(err)));
    }
  }

  // Handler for delete (use writeRow with { action: 'delete' })
  async function handleDelete(row) {
    if (!confirm(`Delete tender ${row.tenderId}?`)) return;
    try {
      await writeRow(SHEET, "delete", { tender_id: row.tenderId });
      window.location.reload();
    } catch (err) {
      alert("Error deleting: " + (err?.message || String(err)));
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Tender Management</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Manage and oversee all CENABAST tenders from registration through delivery tracking.
      </p>

      {/* Summary cards (optional) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Active</div>
          <div className="text-2xl font-semibold">{filtered.length}</div>
        </div>
        {/* ... add more cards if you want ... */}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-[260px,1fr] gap-6">
        <aside className="bg-card border border-border rounded-lg p-4">
          <label className="block text-sm text-muted-foreground">Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-1 w-full border border-border rounded px-3 py-2"
            placeholder="Tender ID or Title…"
          />

          <label className="block text-sm text-muted-foreground mt-4">Status</label>
          <select
            className="mt-1 w-full border border-border rounded px-3 py-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            <option>Draft</option>
            <option>Submitted</option>
            <option>In Delivery</option>
            <option>Rejected</option>
            <option>Awarded</option>
          </select>
        </aside>

        {/* Data table */}
        <section className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left">Tender ID</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Products</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Delivery Date</th>
                <th className="px-4 py-3 text-left">Stock Coverage</th>
                <th className="px-4 py-3 text-left">Total Value</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-red-600">
                    Error: {String(error)}
                  </td>
                </tr>
              )}
              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No tenders found.
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                filtered.map((row) => (
                  <tr key={row.tenderId}>
                    <td className="px-4 py-3">{row.tenderId}</td>
                    <td className="px-4 py-3">{row.title || "—"}</td>
                    <td className="px-4 py-3">{row.productsCount ?? 0}</td>
                    <td className="px-4 py-3">{row.status || "—"}</td>
                    <td className="px-4 py-3">{niceDate(row.deliveryDate)}</td>
                    <td className="px-4 py-3">{row.stockCoverage != null ? `${row.stockCoverage} days` : "—"}</td>
                    <td className="px-4 py-3">{numberCLP(row.totalValue)}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="mr-2 text-blue-600 hover:underline" onClick={() => {
                        // open edit modal (not shown here)
                      }}>
                        Edit
                      </button>
                      <button className="text-red-600 hover:underline" onClick={() => handleDelete(row)}>Delete</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

export default TenderManagementPage;
