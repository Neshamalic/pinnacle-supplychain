// src/pages/tender-management/index.jsx
import React, { useMemo, useState } from "react";
import Icon from "@/components/AppIcon";
import Button from "@/components/ui/Button";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Header from "@/components/ui/Header";

import { useSheet } from "@/lib/sheetsApi";
import {
  mapTenders,
  mapTenderItems,
  mapPresentations, // <- asegura que exista en src/lib/adapters.js (ya te lo pasé)
} from "@/lib/adapters";

const API_URL = import.meta.env.VITE_SHEETS_API_URL;

/* ========== utils ========== */
const str = (v) => (v == null ? "" : String(v).trim());
const toISO = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
};
const fmtCLP = (n) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(Number.isFinite(+n) ? +n : 0);

/* ========== small UI bits ========== */
const StatusBadge = ({ value }) => {
  const v = String(value || "").toLowerCase();
  const color =
    v === "awarded"
      ? "bg-green-100 text-green-700"
      : v === "submitted"
      ? "bg-blue-100 text-blue-700"
      : v === "rejected"
      ? "bg-red-100 text-red-700"
      : v === "in delivery" || v === "in-delivery"
      ? "bg-amber-100 text-amber-700"
      : "bg-muted text-foreground";
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${color}`}>
      {value || "—"}
    </span>
  );
};

const CoverageBadge = ({ days }) => {
  const d = Number.isFinite(+days) ? +days : 0;
  const color = d < 10 ? "bg-red-100 text-red-700" : d < 30 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700";
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${color}`}>
      {d} days
    </span>
  );
};

/* ========== modal para crear/editar (también sirve de "View" con readOnly) ========== */
function TenderModal({ open, onClose, onSave, tender, readOnly = false }) {
  const [form, setForm] = useState(() => ({
    tender_id: tender?.tenderId || "",
    title: tender?.title || "",
    status: tender?.status || "",
    delivery_date: tender?.deliveryDate ? str(tender.deliveryDate).slice(0, 10) : "",
  }));

  React.useEffect(() => {
    if (!open) return;
    setForm({
      tender_id: tender?.tenderId || "",
      title: tender?.title || "",
      status: tender?.status || "",
      delivery_date: tender?.deliveryDate ? str(tender.deliveryDate).slice(0, 10) : "",
    });
  }, [open, tender]);

  if (!open) return null;

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const submit = (e) => {
    e.preventDefault();
    if (readOnly) return;
    onSave?.(form);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50">
      <div className="bg-card w-full max-w-lg rounded-lg border border-border shadow-modal overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            {readOnly ? "View Tender" : tender ? "Edit Tender" : "New Tender"}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <Icon name="X" size={18} />
          </Button>
        </div>

        <form className="p-4 space-y-4" onSubmit={submit}>
          <div>
            <label className="text-sm text-muted-foreground">Tender ID</label>
            <input
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 ring-ring"
              name="tender_id"
              value={form.tender_id}
              onChange={onChange}
              disabled={!!tender || readOnly}
              placeholder="CENABAST-2024-001"
              required
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Title</label>
            <input
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 ring-ring"
              name="title"
              value={form.title}
              onChange={onChange}
              disabled={readOnly}
              placeholder="Medicamentos…"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">Status</label>
              <select
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 ring-ring"
                name="status"
                value={form.status}
                onChange={onChange}
                disabled={readOnly}
              >
                <option value="">—</option>
                <option value="Draft">Draft</option>
                <option value="Submitted">Submitted</option>
                <option value="Rejected">Rejected</option>
                <option value="In Delivery">In Delivery</option>
                <option value="Awarded">Awarded</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Delivery Date</label>
              <input
                type="date"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 ring-ring"
                name="delivery_date"
                value={form.delivery_date}
                onChange={onChange}
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            {!readOnly && (
              <Button type="submit" variant="default">
                Save
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

/* ========== Página ========== */
const TenderManagement = () => {
  // datos base
  const { rows: tenders = [], loading: loadingT } = useSheet("tenders", mapTenders);
  const { rows: items = [], loading: loadingI } = useSheet("tender_items", mapTenderItems);
  const { rows: pres = [], loading: loadingP } = useSheet("product_presentation_master", mapPresentations);

  // filtros
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // modales / acciones
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTender, setModalTender] = useState(null);
  const [readOnly, setReadOnly] = useState(false);

  const presMap = useMemo(() => {
    const m = new Map();
    for (const p of pres) m.set(p.presentationCode, p);
    return m;
  }, [pres]);

  // agrupa por tenderId y calcula métricas
  const rows = useMemo(() => {
    const byId = new Map();

    // base desde tenders
    for (const t of tenders) {
      const id = t.tenderId || t.id || "";
      if (!id) continue;
      byId.set(id, {
        tenderId: id,
        title: t.title || "",
        status: t.status || "",
        deliveryDate: t.deliveryDate || "",
        rawStockCoverage: t.stockCoverage || "", // si lo traes precalculado
        products: new Set(),
        totalCLP: 0,
      });
    }

    // acumula items -> products + valor
    for (const it of items) {
      const id = it.tenderId || "";
      if (!id || !byId.has(id)) continue;
      const agg = byId.get(id);

      if (it.presentationCode) agg.products.add(it.presentationCode);

      const pkgUnits = presMap.get(it.presentationCode)?.packageUnits || 1;
      const line = (Number(it.awardedQty) || 0) * (Number(it.unitPrice) || 0) * pkgUnits;
      agg.totalCLP += line;
    }

    // arma arreglo final + filtros
    let arr = Array.from(byId.values()).map((r) => ({
      tenderId: r.tenderId,
      title: r.title,
      status: r.status,
      deliveryDate: r.deliveryDate,
      productsCount: r.products.size,
      // Stock Coverage “demo”: si no viene de la hoja, lo dejo en 0
      stockDays: Number.parseInt(String(r.rawStockCoverage).replace(/\D/g, ""), 10) || 0,
      totalValueCLP: r.totalCLP,
    }));

    // filtros
    const s = search.toLowerCase().trim();
    if (s) {
      arr = arr.filter(
        (r) =>
          r.tenderId.toLowerCase().includes(s) ||
          r.title.toLowerCase().includes(s)
      );
    }
    if (statusFilter) {
      arr = arr.filter((r) => String(r.status).toLowerCase() === statusFilter.toLowerCase());
    }

    // orden por deliveryDate
    arr.sort((a, b) => {
      const ta = a.deliveryDate ? new Date(a.deliveryDate).getTime() : 0;
      const tb = b.deliveryDate ? new Date(b.deliveryDate).getTime() : 0;
      return ta - tb;
    });

    return arr;
  }, [tenders, items, presMap, search, statusFilter]);

  const loading = loadingT || loadingI || loadingP;

  /* ===== acciones CRUD contra App Script ===== */
  const saveTender = async (form) => {
    if (!API_URL) {
      alert("Falta VITE_SHEETS_API_URL");
      return;
    }
    const isEdit = !!modalTender;
    const payload = {
      name: "tenders",
      row: {
        tender_id: form.tender_id,
        title: form.title,
        status: form.status,
        delivery_date: form.delivery_date,
      },
      route: "write",
      action: isEdit ? "update" : "create",
    };

    try {
      await fetch(`${API_URL}?route=write&action=${isEdit ? "update" : "create"}&name=tenders`, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      }).then((r) => r.json());

      setModalOpen(false);
      setModalTender(null);
      setReadOnly(false);
      // recarga simple para refrescar useSheet
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Error saving tender: " + e);
    }
  };

  const deleteTender = async (t) => {
    if (!API_URL) {
      alert("Falta VITE_SHEETS_API_URL");
      return;
    }
    if (!window.confirm(`Delete tender ${t.tenderId}?`)) return;

    const payload = {
      name: "tenders",
      where: { tender_id: t.tenderId },
      route: "write",
      action: "delete",
    };

    try {
      await fetch(`${API_URL}?route=write&action=delete&name=tenders`, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      }).then((r) => r.json());
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Error deleting tender: " + e);
    }
  };

  /* ===== eventos de UI ===== */
  const openView = (t) => {
    setModalTender(t);
    setReadOnly(true);
    setModalOpen(true);
  };
  const openEdit = (t) => {
    setModalTender(t);
    setReadOnly(false);
    setModalOpen(true);
  };
  const openNew = () => {
    setModalTender(null);
    setReadOnly(false);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Breadcrumb />
          <div className="flex items-center justify-between mt-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Tender Management</h1>
              <p className="text-muted-foreground mt-2">
                Manage and oversee all CENABAST tenders from registration through delivery tracking.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" iconName="Download" iconPosition="left" type="button">
                Export
              </Button>
              <Button variant="default" iconName="Plus" iconPosition="left" type="button" onClick={openNew}>
                New Tender
              </Button>
            </div>
          </div>

          {/* layout con filtros a la izquierda */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Filtros */}
            <aside className="lg:col-span-3">
              <div className="bg-card rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Filters</h3>

                <div className="mb-4">
                  <label className="text-xs text-muted-foreground">Search</label>
                  <input
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 ring-ring"
                    placeholder="Tender ID or Title…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="mb-4">
                  <label className="text-xs text-muted-foreground">Status</label>
                  <select
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 ring-ring"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="Draft">Draft</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Rejected">Rejected</option>
                    <option value="In Delivery">In Delivery</option>
                    <option value="Awarded">Awarded</option>
                  </select>
                </div>

                <Button variant="outline" type="button" onClick={() => { setSearch(""); setStatusFilter(""); }}>
                  Clear Filters
                </Button>
              </div>
            </aside>

            {/* Tabla */}
            <section className="lg:col-span-9">
              <div className="bg-card rounded-lg border border-border shadow-soft overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted border-b border-border">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-medium text-foreground">Tender ID</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-foreground">Title</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-foreground">Products</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-foreground">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-foreground">Delivery Date</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-foreground">Stock Coverage</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-foreground">Total Value</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {loading && (
                        <tr>
                          <td className="px-6 py-8 text-sm text-muted-foreground" colSpan={8}>
                            Loading tenders…
                          </td>
                        </tr>
                      )}

                      {!loading && rows.length === 0 && (
                        <tr>
                          <td className="px-6 py-8 text-center text-muted-foreground" colSpan={8}>
                            No tenders found.
                          </td>
                        </tr>
                      )}

                      {!loading &&
                        rows.map((r) => (
                          <tr key={r.tenderId} className="hover:bg-muted/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-foreground">{r.tenderId}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-foreground">{r.title || "—"}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-foreground">{r.productsCount}</div>
                            </td>
                            <td className="px-6 py-4">
                              <StatusBadge value={r.status} />
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-foreground">
                                {r.deliveryDate ? new Date(r.deliveryDate).toLocaleDateString("en-GB") : "—"}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <CoverageBadge days={r.stockDays} />
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-foreground">{fmtCLP(r.totalValueCLP)}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  iconName="Eye"
                                  iconPosition="left"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openView(r);
                                  }}
                                >
                                  View
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  iconName="Edit"
                                  iconPosition="left"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEdit(r);
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  iconName="Trash"
                                  iconPosition="left"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteTender(r);
                                  }}
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
            </section>
          </div>
        </div>
      </main>

      <TenderModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setReadOnly(false);
          setModalTender(null);
        }}
        onSave={saveTender}
        tender={modalTender}
        readOnly={readOnly}
      />
    </div>
  );
};

export default TenderManagement;

