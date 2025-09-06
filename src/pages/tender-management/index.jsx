// src/pages/tender-management/index.jsx
import React, { useMemo, useState } from "react";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";
import { useSheet, writeRow } from "../../lib/sheetsApi";
import { mapTenders } from "../../lib/adapters";

const STATUS_COLORS = {
  Draft: "bg-gray-200 text-gray-800",
  Submitted: "bg-blue-100 text-blue-700",
  "In Delivery": "bg-amber-100 text-amber-700",
  Awarded: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
};

function StatusPill({ value }) {
  const cls = STATUS_COLORS[value] || "bg-slate-100 text-slate-700";
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${cls}`}>{value || "—"}</span>
  );
}

function formatCLP(n) {
  if (n == null || n === "") return "—";
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(
    Number(n)
  );
}

function formatDate(d) {
  if (!d) return "—";
  const dd = new Date(d);
  if (isNaN(dd.getTime())) return d; // ya viene bonito
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }).format(dd);
}

/* -------------------- MODAL CREATE/EDIT -------------------- */
function TenderFormModal({ open, onClose, initial, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    tender_id: initial?.tenderId || "",
    title: initial?.title || "",
    status: initial?.status || "",
    products_count: initial?.productsCount ?? "",
    delivery_date: initial?.deliveryDate || "",
    stock_coverage_days: initial?.stockCoverage ?? "",
    total_value_clp: initial?.totalValue ?? "",
  }));

  if (!open) return null;

  const isEdit = Boolean(initial);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        // Clave por tender_id (ajusta si tu clave es otra)
        await writeRow("tenders", "update", {
          keys: { tender_id: initial.tenderId },
          values: form,
        });
      } else {
        await writeRow("tenders", "create", { values: form });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      alert(`Error al guardar: ${err?.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-modal p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            {isEdit ? "Edit Tender" : "New Tender"}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" size={18} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tender ID (clave). En edición permitimos verlo pero no cambiarlo */}
          <div className="col-span-1">
            <label className="block text-sm text-muted-foreground mb-1">Tender ID</label>
            <input
              className="w-full border border-border rounded px-3 py-2"
              name="tender_id"
              value={form.tender_id}
              onChange={handleChange}
              placeholder="CENABAST-2024-001"
              disabled={isEdit}
              required
            />
          </div>

          <div className="col-span-1">
            <label className="block text-sm text-muted-foreground mb-1">Status</label>
            <select
              className="w-full border border-border rounded px-3 py-2"
              name="status"
              value={form.status}
              onChange={handleChange}
            >
              <option value="">Select…</option>
              <option>Draft</option>
              <option>Submitted</option>
              <option>In Delivery</option>
              <option>Awarded</option>
              <option>Rejected</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-muted-foreground mb-1">Title</label>
            <input
              className="w-full border border-border rounded px-3 py-2"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Suministro de medicamentos…"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1">Products (count)</label>
            <input
              className="w-full border border-border rounded px-3 py-2"
              name="products_count"
              type="number"
              value={form.products_count}
              onChange={handleChange}
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1">Delivery date</label>
            <input
              className="w-full border border-border rounded px-3 py-2"
              name="delivery_date"
              type="date"
              value={form.delivery_date}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1">Stock coverage (days)</label>
            <input
              className="w-full border border-border rounded px-3 py-2"
              name="stock_coverage_days"
              type="number"
              value={form.stock_coverage_days}
              onChange={handleChange}
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1">Total value (CLP)</label>
            <input
              className="w-full border border-border rounded px-3 py-2"
              name="total_value_clp"
              type="number"
              value={form.total_value_clp}
              onChange={handleChange}
              min="0"
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------- CONFIRM DELETE -------------------- */
function ConfirmDelete({ open, onClose, onConfirm, tender }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-xl shadow-modal p-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">Delete tender</h3>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete <b>{tender?.tenderId}</b>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------- PAGE -------------------- */
export default function TenderManagement() {
  const { rows, loading, error } = useSheet("tenders", mapTenders);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const tenders = useMemo(() => rows ?? [], [rows]);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    setModalOpen(true);
  };

  const handleSaved = () => {
    // forma simple de refrescar (si quieres algo más fino, cambia useSheet para exponer refresh)
    window.location.reload();
  };

  const askDelete = (row) => {
    setToDelete(row);
    setConfirmOpen(true);
  };

  const doDelete = async () => {
    try {
      await writeRow("tenders", "delete", {
        keys: { tender_id: toDelete.tenderId },
      });
      setConfirmOpen(false);
      setToDelete(null);
      window.location.reload();
    } catch (err) {
      alert(`Error deleting: ${err?.message || err}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tender Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage and oversee all CENABAST tenders from registration through delivery tracking.
          </p>
        </div>
        <Button onClick={openNew} iconName="Plus">
          New Tender
        </Button>
      </div>

      {/* Content */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left">Tender ID</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Products</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Delivery Date</th>
                <th className="px-4 py-3 text-left">Stock Coverage</th>
                <th className="px-4 py-3 text-left">Total Value</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Loading tenders…
                  </td>
                </tr>
              )}
              {error && !loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-red-600">
                    Error: {error}
                  </td>
                </tr>
              )}
              {!loading && !error && tenders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No tenders found.
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                tenders.map((t) => (
                  <tr key={t.id || t.tenderId} className="hover:bg-muted/40">
                    <td className="px-4 py-3">{t.tenderId || "—"}</td>
                    <td className="px-4 py-3">{t.title || "—"}</td>
                    <td className="px-4 py-3">{t.productsCount ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusPill value={t.status} />
                    </td>
                    <td className="px-4 py-3">{formatDate(t.deliveryDate)}</td>
                    <td className="px-4 py-3">{t.stockCoverage != null ? `${t.stockCoverage} days` : "—"}</td>
                    <td className="px-4 py-3">{formatCLP(t.totalValue)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" iconName="Edit" onClick={() => openEdit(t)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          iconName="Trash2"
                          onClick={() => askDelete(t)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <TenderFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={editing}
        onSaved={handleSaved}
      />
      <ConfirmDelete
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={doDelete}
        tender={toDelete}
      />
    </div>
  );
}
