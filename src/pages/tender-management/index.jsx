// src/pages/tender-management/index.jsx
import React, { useMemo, useState, useEffect } from "react";

import Header from "../../components/ui/Header";
import Breadcrumb from "../../components/ui/Breadcrumb";
import Button from "../../components/ui/Button";
import Icon from "../../components/AppIcon";

// Datos desde Google Sheets
import { useSheet } from "../../lib/sheetsApi";
import { mapTenders, mapTenderItems } from "../../lib/adapters";

const API_URL = import.meta.env.VITE_SHEETS_API_URL;

/* =============== UI helpers =============== */
const t = (lang, en, es) => (lang === "es" ? es : en);

const fmtCLP = (n) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(+n) ? +n : 0);

const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
};

const StatusBadge = ({ value }) => {
  const val = String(value || "").toLowerCase();
  const color =
    val === "awarded"
      ? "bg-emerald-100 text-emerald-700"
      : val === "in delivery"
      ? "bg-amber-100 text-amber-700"
      : val === "submitted"
      ? "bg-sky-100 text-sky-700"
      : val === "rejected"
      ? "bg-rose-100 text-rose-700"
      : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${color}`}>
      {value || "—"}
    </span>
  );
};

/* =============== Modales =============== */

function ViewTenderModal({ isOpen, onClose, tender, summary, currentLanguage }) {
  if (!isOpen || !tender) return null;
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg shadow-modal max-w-xl w-full mx-4 overflow-hidden border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {t(currentLanguage, "Tender Details", "Detalle de Licitación")}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" size={18} />
          </Button>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">
                {t(currentLanguage, "Tender ID", "ID Licitación")}
              </div>
              <div className="font-medium">{summary.tenderId}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                {t(currentLanguage, "Delivery Date", "Fecha Entrega")}
              </div>
              <div className="font-medium">{fmtDate(tender.deliveryDate)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                {t(currentLanguage, "Status", "Estado")}
              </div>
              <StatusBadge value={tender.status} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                {t(currentLanguage, "Products", "Productos")}
              </div>
              <div className="font-medium">{summary.products}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                {t(currentLanguage, "Stock Coverage", "Stock Coverage")}
              </div>
              <div className="font-medium">
                {summary.stockCoverageDays != null ? `${summary.stockCoverageDays} days` : "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                {t(currentLanguage, "Total Value", "Valor Total")}
              </div>
              <div className="font-medium">{fmtCLP(summary.totalValueClp)}</div>
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">
              {t(currentLanguage, "Title", "Título")}
            </div>
            <div className="font-medium">{tender.title || "—"}</div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            {t(currentLanguage, "Close", "Cerrar")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditTenderModal({ isOpen, onClose, tender, onSaved, currentLanguage }) {
  const [form, setForm] = useState({
    tender_id: "",
    title: "",
    status: "",
    delivery_date: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !tender) return;
    const tenderId = tender.tenderId || tender.tender_id || tender.tender_number || "";
    const d = tender.deliveryDate ? new Date(tender.deliveryDate) : null;
    const ymd =
      d && !Number.isNaN(d.getTime())
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
            d.getDate()
          ).padStart(2, "0")}`
        : "";

    setForm({
      tender_id: tenderId,
      title: tender.title || "",
      status: tender.status || "",
      delivery_date: ymd,
    });
  }, [isOpen, tender]);

  if (!isOpen || !tender) return null;

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!API_URL) {
      alert("VITE_SHEETS_API_URL missing");
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(
        `${API_URL}?route=write&action=update&name=tenders`,
        {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(form),
        }
      );
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Unknown error");
      onSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
      alert(`${t(currentLanguage, "Save error:", "Error al guardar:")} ${String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg shadow-modal max-w-xl w-full mx-4 overflow-hidden border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {t(currentLanguage, "Edit Tender", "Editar Licitación")}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" size={18} />
          </Button>
        </div>

        <form onSubmit={onSubmit} className="p-4 space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">
              {t(currentLanguage, "Tender ID", "ID Licitación")}
            </label>
            <input
              name="tender_id"
              type="text"
              value={form.tender_id}
              onChange={onChange}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Title</label>
            <input
              name="title"
              type="text"
              value={form.title}
              onChange={onChange}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              placeholder={t(currentLanguage, "e.g. Rivaroxaban 20 mg", "ej: Rivaroxaban 20 mg")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">{t(currentLanguage, "Status", "Estado")}</label>
              <select
                name="status"
                value={form.status}
                onChange={onChange}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              >
                <option value="">{t(currentLanguage, "— Select —", "— Selecciona —")}</option>
                <option value="Draft">Draft</option>
                <option value="Submitted">Submitted</option>
                <option value="Rejected">Rejected</option>
                <option value="In Delivery">In Delivery</option>
                <option value="Awarded">Awarded</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">
                {t(currentLanguage, "Delivery Date", "Fecha de Entrega")}
              </label>
              <input
                name="delivery_date"
                type="date"
                value={form.delivery_date}
                onChange={onChange}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t(currentLanguage, "Cancel", "Cancelar")}
            </Button>
            <Button type="submit" variant="default" disabled={saving}>
              {saving ? t(currentLanguage, "Saving…", "Guardando…") : t(currentLanguage, "Save", "Guardar")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NewTenderModal({ isOpen, onClose, onSaved, currentLanguage }) {
  const [form, setForm] = useState({
    tender_id: "",
    title: "",
    status: "",
    delivery_date: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setForm({ tender_id: "", title: "", status: "", delivery_date: "" });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!API_URL) {
      alert("VITE_SHEETS_API_URL missing");
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}?route=write&action=create&name=tenders`, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Unknown error");
      onSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
      alert(`${t(currentLanguage, "Create error:", "Error al crear:")} ${String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg shadow-modal max-w-xl w-full mx-4 overflow-hidden border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {t(currentLanguage, "New Tender", "Nueva Licitación")}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" size={18} />
          </Button>
        </div>

        <form onSubmit={onSubmit} className="p-4 space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">
              {t(currentLanguage, "Tender ID", "ID Licitación")}
            </label>
            <input
              name="tender_id"
              type="text"
              value={form.tender_id}
              onChange={onChange}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Title</label>
            <input
              name="title"
              type="text"
              value={form.title}
              onChange={onChange}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">{t(currentLanguage, "Status", "Estado")}</label>
              <select
                name="status"
                value={form.status}
                onChange={onChange}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              >
                <option value="">{t(currentLanguage, "— Select —", "— Selecciona —")}</option>
                <option value="Draft">Draft</option>
                <option value="Submitted">Submitted</option>
                <option value="Rejected">Rejected</option>
                <option value="In Delivery">In Delivery</option>
                <option value="Awarded">Awarded</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">
                {t(currentLanguage, "Delivery Date", "Fecha de Entrega")}
              </label>
              <input
                name="delivery_date"
                type="date"
                value={form.delivery_date}
                onChange={onChange}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t(currentLanguage, "Cancel", "Cancelar")}
            </Button>
            <Button type="submit" variant="default" disabled={saving}>
              {saving ? t(currentLanguage, "Saving…", "Guardando…") : t(currentLanguage, "Create", "Crear")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =============== Página =============== */

const TenderManagement = () => {
  const [currentLanguage, setCurrentLanguage] = useState("en");

  // filtros mínimos (Search + Status)
  const [filters, setFilters] = useState({ search: "", status: "" });

  const [viewTender, setViewTender] = useState(null);
  const [editTender, setEditTender] = useState(null);
  const [newOpen, setNewOpen] = useState(false);

  // Trae TENDERS y TENDER_ITEMS
  const {
    rows: tenders = [],
    loading: loadingTenders,
    error: errorTenders,
    refresh: refreshTenders,
  } = useSheet("tenders", mapTenders);

  const {
    rows: items = [],
    loading: loadingItems,
    error: errorItems,
  } = useSheet("tender_items", mapTenderItems);

  useEffect(() => {
    const saved = localStorage.getItem("language") || "en";
    setCurrentLanguage(saved);
    const onStorage = () => setCurrentLanguage(localStorage.getItem("language") || "en");
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Índice de ítems por tender_id + agregados
  const byTender = useMemo(() => {
    const map = new Map();
    (items || []).forEach((it) => {
      const tenderId = it?.tenderId || it?.tender_id || it?.tender_number || "";
      if (!tenderId) return;

      const awardedQty = Number(it?.awardedQty ?? it?.awarded_qty ?? 0);
      const unitPrice = Number(it?.unitPrice ?? it?.unit_price ?? 0);
      const scDays = it?.stockCoverageDays ?? it?.stock_coverage_days;

      if (!map.has(tenderId)) {
        map.set(tenderId, {
          productsSet: new Set(),
          totalValueClp: 0,
          stockCoverageDays: null,
        });
      }
      const agg = map.get(tenderId);
      // Unicidad por presentation_code
      const pcode = it?.presentationCode || it?.presentation_code || it?.presentation || "";
      if (pcode) agg.productsSet.add(pcode);

      // total value = sum(awarded_qty * unit_price)
      agg.totalValueClp += (Number.isFinite(awardedQty) ? awardedQty : 0) * (Number.isFinite(unitPrice) ? unitPrice : 0);

      // stock coverage -> tomamos el mínimo disponible (peor caso)
      const days = Number(scDays);
      if (Number.isFinite(days)) {
        if (agg.stockCoverageDays == null) agg.stockCoverageDays = days;
        else agg.stockCoverageDays = Math.min(agg.stockCoverageDays, days);
      }
    });

    // Convertimos a objeto simple
    const out = {};
    for (const [k, v] of map.entries()) {
      out[k] = {
        products: v.productsSet.size,
        totalValueClp: Math.round(v.totalValueClp),
        stockCoverageDays: v.stockCoverageDays,
      };
    }
    return out;
  }, [items]);

  // Enriquecer TENDERS con agregados y aplicar filtros
  const tableRows = useMemo(() => {
    const list = (tenders || []).map((t) => {
      const tenderId = t?.tenderId || t?.tender_id || t?.tender_number || "";
      const agg = byTender[tenderId] || { products: 0, totalValueClp: 0, stockCoverageDays: null };
      return {
        ...t,
        tenderId,
        products: agg.products,
        totalValueClp: agg.totalValueClp,
        stockCoverageDays: agg.stockCoverageDays,
      };
    });

    const search = (filters.search || "").toLowerCase();
    const status = (filters.status || "").toLowerCase();

    return list.filter((r) => {
      if (search) {
        const a = (r.tenderId || "").toLowerCase();
        const b = (r.title || "").toLowerCase();
        if (!a.includes(search) && !b.includes(search)) return false;
      }
      if (status && String(r.status || "").toLowerCase() !== status) return false;
      return true;
    });
  }, [tenders, byTender, filters]);

  const loading = loadingTenders || loadingItems;
  const error = errorTenders || errorItems;

  /* -------- acciones CRUD -------- */
  const handleDelete = async (row) => {
    if (!API_URL) {
      alert("VITE_SHEETS_API_URL missing");
      return;
    }
    const tenderId = row?.tenderId || row?.tender_id || row?.tender_number || "";
    if (!tenderId) return;
    if (!confirm(`Delete tender "${tenderId}"?`)) return;

    try {
      const res = await fetch(`${API_URL}?route=write&action=delete&name=tenders`, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ tender_id: tenderId }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Unknown error");
      refreshTenders?.();
    } catch (err) {
      console.error(err);
      alert(`Delete error: ${String(err)}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Breadcrumb />

          <div className="flex items-center justify-between mt-4 mb-6">
            <h1 className="text-3xl font-bold text-foreground">
              {t(currentLanguage, "Tender Management", "Tender Management")}
            </h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" iconName="Download" iconPosition="left">
                {t(currentLanguage, "Export", "Exportar")}
              </Button>
              <Button variant="default" iconName="Plus" iconPosition="left" onClick={() => setNewOpen(true)}>
                {t(currentLanguage, "New Tender", "New Tender")}
              </Button>
            </div>
          </div>

          {/* Filtros simples */}
          <div className="bg-card rounded-lg border border-border p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-muted-foreground">
                  {t(currentLanguage, "Search", "Buscar")}
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
                  placeholder={t(currentLanguage, "Tender ID or Title…", "ID o título…")}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">{t(currentLanguage, "Status", "Estado")}</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
                >
                  <option value="">{t(currentLanguage, "All", "Todos")}</option>
                  <option value="Draft">Draft</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Rejected">Rejected</option>
                  <option value="In Delivery">In Delivery</option>
                  <option value="Awarded">Awarded</option>
                </select>
              </div>
              <div className="self-end">
                <Button
                  variant="outline"
                  onClick={() => setFilters({ search: "", status: "" })}
                  iconName="XCircle"
                  iconPosition="left"
                >
                  {t(currentLanguage, "Clear Filters", "Limpiar filtros")}
                </Button>
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="bg-card rounded-lg border border-border overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                      {t(currentLanguage, "Tender ID", "Tender ID")}
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                      {t(currentLanguage, "Title", "Title")}
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                      {t(currentLanguage, "Products", "Products")}
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                      {t(currentLanguage, "Status", "Status")}
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                      {t(currentLanguage, "Delivery Date", "Delivery Date")}
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                      {t(currentLanguage, "Stock Coverage", "Stock Coverage")}
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                      {t(currentLanguage, "Total Value", "Total Value")}
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                      {t(currentLanguage, "Actions", "Actions")}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {loading && (
                    <tr>
                      <td colSpan={8} className="px-6 py-6 text-sm">
                        Loading…
                      </td>
                    </tr>
                  )}

                  {error && (
                    <tr>
                      <td colSpan={8} className="px-6 py-6 text-sm text-red-600">
                        Error: {String(error)}
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    !error &&
                    tableRows.map((row) => (
                      <tr key={row.tenderId || row.id || crypto.randomUUID()} className="hover:bg-muted/50">
                        <td className="px-6 py-4 font-medium text-foreground">
                          {row.tenderId || "—"}
                        </td>
                        <td className="px-6 py-4">{row.title || "—"}</td>
                        <td className="px-6 py-4">{row.products ?? 0}</td>
                        <td className="px-6 py-4">
                          <StatusBadge value={row.status} />
                        </td>
                        <td className="px-6 py-4">{fmtDate(row.deliveryDate)}</td>
                        <td className="px-6 py-4">
                          {row.stockCoverageDays != null ? `${row.stockCoverageDays} days` : "—"}
                        </td>
                        <td className="px-6 py-4">{fmtCLP(row.totalValueClp)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              iconName="Eye"
                              onClick={() => setViewTender(row)}
                            >
                              {t(currentLanguage, "View", "View")}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              iconName="Edit"
                              onClick={() => setEditTender(row)}
                            >
                              {t(currentLanguage, "Edit", "Edit")}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              iconName="Trash2"
                              onClick={() => handleDelete(row)}
                            >
                              {t(currentLanguage, "Delete", "Delete")}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}

                  {!loading && !error && tableRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-muted-foreground">
                        {t(currentLanguage, "No tenders found.", "No se encontraron licitaciones.")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modales */}
          <NewTenderModal
            isOpen={newOpen}
            onClose={() => setNewOpen(false)}
            onSaved={refreshTenders}
            currentLanguage={currentLanguage}
          />
          <EditTenderModal
            isOpen={!!editTender}
            onClose={() => setEditTender(null)}
            tender={editTender}
            onSaved={refreshTenders}
            currentLanguage={currentLanguage}
          />
          <ViewTenderModal
            isOpen={!!viewTender}
            onClose={() => setViewTender(null)}
            tender={viewTender}
            summary={{
              tenderId: viewTender?.tenderId || "",
              products: viewTender?.products ?? 0,
              stockCoverageDays:
                viewTender?.stockCoverageDays != null ? viewTender.stockCoverageDays : null,
              totalValueClp: viewTender?.totalValueClp ?? 0,
            }}
            currentLanguage={currentLanguage}
          />
        </div>
      </main>
    </div>
  );
};

export default TenderManagement;
