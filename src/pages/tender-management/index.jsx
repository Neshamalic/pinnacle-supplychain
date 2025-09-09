// src/pages/tender-management/index.jsx
import React, { useEffect, useMemo, useState } from "react";
import Header from "../../components/ui/Header";
import Breadcrumb from "../../components/ui/Breadcrumb";
import Button from "../../components/ui/Button";
import Icon from "../../components/AppIcon";

import TenderStatusBadge from "./components/TenderStatusBadge";
import StockCoverageBadge from "./components/StockCoverageBadge";
import TenderDetailsDrawer from "./components/TenderDetailsDrawer";

import { useSheet } from "../../lib/sheetsApi";
import {
  mapTenders,
  mapTenderItems,
  mapPresentationMaster,
  _utils,
} from "../../lib/adapters";

const { str, toNumber } = _utils;
const API_URL = import.meta.env.VITE_SHEETS_API_URL;

// --------- helpers ----------
const fmtMoneyCLP = (v) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(+v) ? +v : 0);

const fmtDate = (dLike) => {
  if (!dLike) return "—";
  const d = new Date(dLike);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
};

const statusOptions = [
  "draft",
  "submitted",
  "rejected",
  "in delivery",
  "awarded",
];

const normalizeStatus = (s) => str(s || "").toLowerCase();

// ===================================================================
//  PAGE
// ===================================================================
export default function TenderManagement() {
  // Datos base desde Sheets
  const { rows: tenderRows = [], loading: loadingTenders } = useSheet(
    "tenders",
    mapTenders
  );
  const { rows: itemRows = [], loading: loadingItems } = useSheet(
    "tender_items",
    mapTenderItems
  );
  const { rows: masterRows = [], loading: loadingMaster } = useSheet(
    "product_presentation_master",
    mapPresentationMaster
  );

  // Estado UI
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTenderId, setSelectedTenderId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [editDraft, setEditDraft] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Diccionario presentation_code -> {productName, packageUnits}
  const masterByCode = useMemo(() => {
    const map = new Map();
    (masterRows || []).forEach((m) => {
      map.set(m.presentationCode, {
        productName: m.productName || "",
        packageUnits: Number.isFinite(+m.packageUnits) ? +m.packageUnits : 1,
      });
    });
    return map;
  }, [masterRows]);

  // Enriquecer items con packageUnits + totales CLP por ítem
  const itemsEnriched = useMemo(() => {
    return (itemRows || []).map((it) => {
      const m = masterByCode.get(it.presentationCode) || {
        productName: "",
        packageUnits: 1,
      };
      const pkg = m.packageUnits || 1;
      const line = toNumber(it.awardedQty) * toNumber(it.unitPrice) * pkg;
      return {
        ...it,
        productName: m.productName,
        packageUnits: pkg,
        lineTotalCLP: line,
      };
    });
  }, [itemRows, masterByCode]);

  // Agrupar: 1 fila por tenderId, sumando totales, contando productos y adjuntando items
  const grouped = useMemo(() => {
    const byId = new Map();

    itemsEnriched.forEach((it) => {
      if (!it.tenderId) return;
      const prev = byId.get(it.tenderId) || {
        tenderId: it.tenderId,
        productsCount: 0,
        totalCLP: 0,
        items: [],
      };
      prev.items.push(it);
      prev.totalCLP += it.lineTotalCLP;
      byId.set(it.tenderId, prev);
    });

    // productos únicos por presentation_code
    for (const [tid, agg] of byId) {
      const uniques = new Set(agg.items.map((x) => x.presentationCode));
      agg.productsCount = uniques.size;
      byId.set(tid, agg);
    }

    // fusionar con metadatos de la hoja "tenders"
    const tenderById = new Map(
      (tenderRows || []).map((t) => [t.tenderId || t.id, t])
    );

    const final = [];
    for (const [tid, agg] of byId) {
      const meta = tenderById.get(tid) || {};
      final.push({
        tenderId: tid,
        title: meta.title || "",
        status: normalizeStatus(meta.status),
        deliveryDate: meta.deliveryDate || "",
        stockCoverageDays: Number.isFinite(+meta.stockCoverage)
          ? +meta.stockCoverage
          : 0,
        productsCount: agg.productsCount,
        totalCLP: agg.totalCLP,
        items: agg.items,
        _meta: meta,
      });
    }

    // Orden estable por fecha (desc) o por id
    final.sort((a, b) => {
      const ta = a.deliveryDate ? new Date(a.deliveryDate).getTime() : 0;
      const tb = b.deliveryDate ? new Date(b.deliveryDate).getTime() : 0;
      return tb - ta || String(a.tenderId).localeCompare(String(b.tenderId));
    });

    return final;
  }, [itemsEnriched, tenderRows]);

  // Filtros
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return grouped.filter((r) => {
      if (q) {
        const hay =
          String(r.tenderId).toLowerCase().includes(q) ||
          String(r.title).toLowerCase().includes(q);
        if (!hay) return false;
      }
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      return true;
    });
  }, [grouped, search, statusFilter]);

  // Abrir Drawer (View)
  const onView = (tenderId) => {
    setSelectedTenderId(tenderId);
    setDrawerOpen(true);
  };

  // Abrir Edit modal con valores actuales
  const onEdit = (t) => {
    setEditDraft({
      tender_id: t.tenderId,
      title: t.title || "",
      status: t.status || "",
      delivery_date: t.deliveryDate ? t.deliveryDate.slice(0, 10) : "",
    });
    setEditOpen(true);
  };

  // Guardar edición (update tenders)
  const saveEdit = async () => {
    if (!API_URL) return alert("Falta VITE_SHEETS_API_URL");
    try {
      setSaving(true);
      const res = await fetch(
        `${API_URL}?route=write&action=update&name=tenders`,
        {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            tender_id: editDraft.tender_id,
            title: editDraft.title,
            status: editDraft.status,
            delivery_date: editDraft.delivery_date,
          }),
        }
      );
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Error updating");
      setEditOpen(false);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Error al actualizar: " + String(err));
    } finally {
      setSaving(false);
    }
  };

  // Crear rápido (solo mínimos)
  const saveCreate = async (row) => {
    if (!API_URL) return alert("Falta VITE_SHEETS_API_URL");
    try {
      setSaving(true);
      const res = await fetch(
        `${API_URL}?route=write&action=create&name=tenders`,
        {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(row),
        }
      );
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Error creating");
      setCreatingOpen(false);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Error al crear: " + String(err));
    } finally {
      setSaving(false);
    }
  };

  // Borrar tender (y opcional: sus items, si quieres ampliar)
  const onDelete = async (tenderId) => {
    if (!API_URL) return alert("Falta VITE_SHEETS_API_URL");
    if (!confirm(`¿Eliminar tender ${tenderId}?`)) return;
    try {
      setSaving(true);
      const res = await fetch(
        `${API_URL}?route=write&action=delete&name=tenders`,
        {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ tender_id: tenderId, tender_number: tenderId }),
        }
      );
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Error deleting");
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Error al eliminar: " + String(err));
    } finally {
      setSaving(false);
    }
  };

  const loading = loadingTenders || loadingItems || loadingMaster;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Page header */}
          <div className="mb-6">
            <Breadcrumb />
            <div className="flex items-center justify-between mt-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Tender Management
                </h1>
                <p className="text-muted-foreground mt-2">
                  Administra y monitorea licitaciones; totales calculados con{" "}
                  <code>awarded_qty × (unit_price × package_units)</code>.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" iconName="Download">
                  Export
                </Button>
                <Button
                  type="button"
                  variant="default"
                  iconName="Plus"
                  onClick={() => setCreatingOpen(true)}
                >
                  New Tender
                </Button>
              </div>
            </div>
          </div>

          {/* Filters (top) */}
          <div className="bg-card border border-border rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Search</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tender ID o Título…"
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Status</label>
                <select
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s[0].toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-card rounded-lg border border-border shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-foreground">
                      Tender ID
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-foreground">
                      Title
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-foreground">
                      Products
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-foreground">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-foreground">
                      Delivery Date
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-foreground">
                      Stock Coverage
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-foreground">
                      Total Value (CLP)
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading && (
                    <tr>
                      <td className="px-6 py-6 text-sm" colSpan={8}>
                        Loading…
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    filtered.map((row) => (
                      <tr
                        key={row.tenderId}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground">
                            {row.tenderId}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-foreground">{row.title || "—"}</div>
                        </td>
                        <td className="px-6 py-4">{row.productsCount}</td>
                        <td className="px-6 py-4">
                          <TenderStatusBadge status={row.status} />
                        </td>
                        <td className="px-6 py-4">{fmtDate(row.deliveryDate)}</td>
                        <td className="px-6 py-4">
                          <StockCoverageBadge days={row.stockCoverageDays} />
                        </td>
                        <td className="px-6 py-4 font-medium">
                          {fmtMoneyCLP(row.totalCLP)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              iconName="Eye"
                              onClick={() => onView(row.tenderId)}
                            >
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              iconName="Edit"
                              onClick={() => onEdit(row)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              iconName="Trash2"
                              onClick={() => onDelete(row.tenderId)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}

                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center">
                        <Icon
                          name="Package"
                          size={48}
                          className="mx-auto text-muted-foreground mb-2"
                        />
                        <div className="text-lg font-medium">
                          No hay licitaciones
                        </div>
                        <div className="text-muted-foreground">
                          Ajusta los filtros o crea una nueva.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Drawer View */}
          <TenderDetailsDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            tender={
              grouped.find((g) => g.tenderId === selectedTenderId) || null
            }
          />
        </div>
      </main>

      {/* Modal Edit */}
      {editOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg border border-border shadow-modal w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="text-lg font-semibold">Edit Tender</h3>
              <Button variant="ghost" size="icon" onClick={() => setEditOpen(false)}>
                <Icon name="X" size={18} />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Tender ID</label>
                <input
                  disabled
                  value={editDraft.tender_id}
                  className="mt-1 w-full rounded-md border border-border bg-muted px-3 py-2 text-foreground"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Title</label>
                <input
                  value={editDraft.title}
                  onChange={(e) =>
                    setEditDraft((p) => ({ ...p, title: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Status</label>
                  <select
                    value={editDraft.status}
                    onChange={(e) =>
                      setEditDraft((p) => ({ ...p, status: e.target.value }))
                    }
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                  >
                    <option value="">—</option>
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Delivery Date</label>
                  <input
                    type="date"
                    value={editDraft.delivery_date}
                    onChange={(e) =>
                      setEditDraft((p) => ({ ...p, delivery_date: e.target.value }))
                    }
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-border">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button variant="default" onClick={saveEdit} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal New */}
      {creatingOpen && (
        <NewTenderModal
          onClose={() => setCreatingOpen(false)}
          onCreate={saveCreate}
          saving={saving}
        />
      )}
    </div>
  );
}

// ===================================================================
//  NEW TENDER MODAL (simple, mínimo)
// ===================================================================
function NewTenderModal({ onClose, onCreate, saving }) {
  const [form, setForm] = useState({
    tender_id: "",
    title: "",
    status: "",
    delivery_date: "",
  });
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };
  const onSubmit = (e) => {
    e.preventDefault();
    if (!form.tender_id) return alert("Falta Tender ID");
    onCreate(form);
  };
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg border border-border shadow-modal w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="text-lg font-semibold">New Tender</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" size={18} />
          </Button>
        </div>
        <form onSubmit={onSubmit} className="p-4 space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Tender ID</label>
            <input
              name="tender_id"
              value={form.tender_id}
              onChange={onChange}
              placeholder="CENABAST-2024-001"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
              required
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Title</label>
            <input
              name="title"
              value={form.title}
              onChange={onChange}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={onChange}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
              >
                <option value="">—</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Delivery Date</label>
              <input
                type="date"
                name="delivery_date"
                value={form.delivery_date}
                onChange={onChange}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="default" disabled={saving}>
              {saving ? "Saving…" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

