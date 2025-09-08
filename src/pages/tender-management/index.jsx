// src/pages/tender-management/index.jsx
import React, { useMemo, useState } from "react";
import { useSheet} from "../../lib/sheetsApi";
import { mapTenders } from "../../lib/adapters";

// === Config ===
// Si todavía no creas la hoja "tenders", ver paso 2.
// (Puedes cambiar a 'tender_items' si prefieres agrupar desde el detalle)
const SHEET = "tenders";

function Badge({ children, tone = "muted" }) {
  const tones = {
    muted: "bg-muted text-muted-foreground",
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${tones[tone] || tones.muted}`}>
      {children}
    </span>
  );
}

function numberCLP(v) {
  if (v == null || v === "") return "—";
  try {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(v);
  } catch {
    return String(v);
  }
}
function niceDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

// ====== Modal simple para crear/editar ======
function TenderModal({ open, onClose, initial }) {
  const [form, setForm] = useState(() => ({
    tenderId: initial?.tenderId || "",
    title: initial?.title || "",
    status: initial?.status || "Draft",
    productsCount: initial?.productsCount ?? 0,
    deliveryDate: initial?.deliveryDate || "",
    stockCoverage: initial?.stockCoverage ?? 0,
    totalValue: initial?.totalValue ?? 0,
    createdDate: initial?.createdDate || new Date().toISOString().slice(0, 10),
  }));
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial;

  async function handleSave() {
    try {
      setSaving(true);

      // El Apps Script usa KEYS.tenders = ['tender_id'] (ver paso 2).
      const payload = {
        tender_id: form.tenderId,
        title: form.title,
        status: form.status,
        products_count: Number(form.productsCount) || 0,
        delivery_date: form.deliveryDate,
        stock_coverage_days: Number(form.stockCoverage) || 0,
        total_value_clp: Number(form.totalValue) || 0,
        created_date: form.createdDate,
      };

      const action = isEdit ? "update" : "create";
      await writeRow(SHEET, action, payload);
      onClose(true);
    } catch (err) {
      alert("Error al guardar: " + (err?.message || String(err)));
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[2000] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-xl bg-card shadow-modal border border-border">
        <div className="p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            {isEdit ? "Edit Tender" : "New Tender"}
          </h3>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground">Tender ID</label>
            <input
              className="mt-1 w-full border border-border rounded px-3 py-2"
              value={form.tenderId}
              disabled={isEdit}
              onChange={(e) => setForm({ ...form, tenderId: e.target.value })}
              placeholder="621-299-LR25"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Title</label>
            <input
              className="mt-1 w-full border border-border rounded px-3 py-2"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Medicamentos..."
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Status</label>
            <select
              className="mt-1 w-full border border-border rounded px-3 py-2"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option>Draft</option>
              <option>Submitted</option>
              <option>In Delivery</option>
              <option>Rejected</option>
              <option>Awarded</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Products</label>
            <input
              type="number"
              className="mt-1 w-full border border-border rounded px-3 py-2"
              value={form.productsCount}
              onChange={(e) => setForm({ ...form, productsCount: e.target.value })}
              min="0"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Delivery Date</label>
            <input
              type="date"
              className="mt-1 w-full border border-border rounded px-3 py-2"
              value={form.deliveryDate}
              onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Stock Coverage (days)</label>
            <input
              type="number"
              className="mt-1 w-full border border-border rounded px-3 py-2"
              value={form.stockCoverage}
              onChange={(e) => setForm({ ...form, stockCoverage: e.target.value })}
              min="0"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Total Value (CLP)</label>
            <input
              type="number"
              className="mt-1 w-full border border-border rounded px-3 py-2"
              value={form.totalValue}
              onChange={(e) => setForm({ ...form, totalValue: e.target.value })}
              min="0"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Created</label>
            <input
              type="date"
              className="mt-1 w-full border border-border rounded px-3 py-2"
              value={form.createdDate}
              onChange={(e) => setForm({ ...form, createdDate: e.target.value })}
            />
          </div>
        </div>
        <div className="p-4 border-t border-border flex items-center justify-end gap-2">
          <button className="px-4 py-2 rounded border border-border" onClick={() => onClose(false)} disabled={saving}>
            Cancel
          </button>
          <button className="px-4 py-2 rounded bg-primary text-primary-foreground" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TenderManagementPage() {
  const { rows, loading, error } = useSheet(SHEET, mapTenders);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(""); // All

  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const filtered = useMemo(() => {
    let list = rows || [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          String(r.tenderId || "").toLowerCase().includes(q) ||
          String(r.title || "").toLowerCase().includes(q)
      );
    }
    if (status) {
      list = list.filter((r) => String(r.status || "") === status);
    }
    return list;
  }, [rows, search, status]);

  async function handleDelete(r) {
    if (!confirm(`Delete tender ${r.tenderId}?`)) return;
    try {
      // La hoja usa tender_id como llave
      await writeRow(SHEET, "delete", { tender_id: r.tenderId });
      alert("Deleted");
      // Forzamos un reload suave (truco: cerrar/abrir modal que dispara refetch en hook)
      window.location.reload();
    } catch (err) {
      alert("Error al eliminar: " + (err?.message || String(err)));
    }
  }

  return (
    <div className="p-6">
      {/* Header + Acciones */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <nav className="text-sm text-muted-foreground mb-1">Dashboard &rsaquo; Tender Management</nav>
          <h1 className="text-2xl font-semibold text-foreground">Tender Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and oversee all CENABAST tenders from registration through delivery tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-4 py-2 rounded bg-primary text-primary-foreground"
            onClick={() => {
              setEditRow(null);
              setModalOpen(true);
            }}
          >
            + New Tender
          </button>
        </div>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Active</div>
          <div className="text-2xl font-semibold">{filtered.length}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Awarded</div>
          <div className="text-2xl font-semibold">{filtered.filter(r => r.status === "Awarded").length}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">In Delivery</div>
          <div className="text-2xl font-semibold">{filtered.filter(r => r.status === "In Delivery").length}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Critical</div>
          <div className="text-2xl font-semibold">{filtered.filter(r => (r.stockCoverage ?? 0) <= 10).length}</div>
        </div>
      </div>

      {/* Filtros (izquierda simplificada) + Tabla */}
      <div className="grid grid-cols-1 md:grid-cols-[260px,1fr] gap-6">
        {/* Filters */}
        <aside className="rounded-lg border border-border bg-card p-4 h-fit">
          <div className="text-sm font-medium mb-2">Filters</div>
          <div className="mb-3">
            <label className="text-sm text-muted-foreground">Search</label>
            <input
              className="mt-1 w-full border border-border rounded px-3 py-2"
              placeholder="Tender ID or Title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label className="text-sm text-muted-foreground">Status</label>
            <select
              className="mt-1 w-full border border-border rounded px-3 py-2"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All</option>
              <option>Draft</option>
              <option>Submitted</option>
              <option>In Delivery</option>
              <option>Rejected</option>
              <option>Awarded</option>
            </select>
          </div>
        </aside>

        {/* Table */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted border-b border-border text-left">
                <tr className="text-muted-foreground">
                  <th className="px-4 py-3">Tender ID</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Products</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Delivery Date</th>
                  <th className="px-4 py-3">Stock Coverage</th>
                  <th className="px-4 py-3">Total Value</th>
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
                  filtered.map((r) => (
                    <tr key={r.tenderId}>
                      <td className="px-4 py-3 font-medium text-foreground">{r.tenderId}</td>
                      <td className="px-4 py-3">{r.title || "—"}</td>
                      <td className="px-4 py-3">{r.productsCount ?? 0}</td>
                      <td className="px-4 py-3">
                        {r.status ? (
                          <Badge tone={r.status === "Rejected" ? "red" : r.status === "In Delivery" ? "amber" : r.status === "Awarded" ? "green" : "blue"}>
                            {r.status}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">{niceDate(r.deliveryDate)}</td>
                      <td className="px-4 py-3">
                        {r.stockCoverage != null ? (
                          <Badge tone={r.stockCoverage <= 10 ? "red" : r.stockCoverage <= 30 ? "amber" : "green"}>
                            {r.stockCoverage} days
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">{numberCLP(r.totalValue)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-3 justify-end">
                          <button
                            className="text-blue-600 hover:underline"
                            onClick={() => {
                              setEditRow(r);
                              setModalOpen(true);
                            }}
                          >
                            Edit
                          </button>
                          <button className="text-red-600 hover:underline" onClick={() => handleDelete(r)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <TenderModal
        open={modalOpen}
        initial={editRow}
        onClose={(changed) => {
          setModalOpen(false);
          setEditRow(null);
          if (changed) window.location.reload();
        }}
      />
    </div>
  );
}
