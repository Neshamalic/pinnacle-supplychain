// src/pages/tender-management/index.jsx
import React, { useMemo, useState, useEffect } from "react";

import Header from "../../components/ui/Header";
import Breadcrumb from "../../components/ui/Breadcrumb";
import Button from "../../components/ui/Button";
import Icon from "../../components/AppIcon";

import { useSheet } from "@/lib/sheetsApi";
import {
  mapTenders,
  mapTenderItems,
  mapPresentationMaster,
} from "@/lib/adapters";

const API_URL = import.meta.env.VITE_SHEETS_API_URL;

/* ============ Utils UI ============ */
const fmtCLP = (n, lang = "es-CL") =>
  new Intl.NumberFormat(lang, {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(+n) ? +n : 0);

const fmtDate = (v, lang = "es-CL") => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(lang, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
};

const toYMD = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/* ============ Modal reusado (view / edit / create) ============ */
function TenderModal({
  open,
  mode, // "view" | "edit" | "create"
  tender, // {tenderId,title,status,deliveryDate}
  onClose,
  onSaved, // callback tras create/update
}) {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isCreate = mode === "create";

  const [form, setForm] = useState({
    tenderId: "",
    title: "",
    status: "",
    deliveryDate: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isCreate) {
      setForm({ tenderId: "", title: "", status: "", deliveryDate: "" });
    } else {
      setForm({
        tenderId: tender?.tenderId || "",
        title: tender?.title || "",
        status: tender?.status || "",
        deliveryDate: toYMD(tender?.deliveryDate) || "",
      });
    }
  }, [open, isCreate, tender]);

  if (!open) return null;

  const disabled = isView;

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!API_URL) {
      alert("Falta VITE_SHEETS_API_URL");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        tender_id: form.tenderId, // clave para update
        title: form.title,
        status: form.status,
        delivery_date: form.deliveryDate,
      };

      const action = isCreate ? "create" : "update";

      const res = await fetch(
        `${API_URL}?route=write&action=${action}&name=tenders`,
        {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Error");

      onClose();
      onSaved?.();
    } catch (err) {
      console.error(err);
      alert(`Error al guardar: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg border border-border shadow-modal w-full max-w-xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {isView && "Ver Licitación"}
            {isEdit && "Editar Licitación"}
            {isCreate && "Nueva Licitación"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <Icon name="X" size={18} />
          </Button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Tender ID
            </label>
            <input
              name="tenderId"
              type="text"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
              value={form.tenderId}
              onChange={onChange}
              placeholder="e.g. 621-29-LR25"
              required
              disabled={isEdit || isView} // no cambiar clave al editar/ver
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Title
            </label>
            <input
              name="title"
              type="text"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
              value={form.title}
              onChange={onChange}
              placeholder="Tender title"
              disabled={disabled}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Status
              </label>
              <select
                name="status"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
                value={form.status}
                onChange={onChange}
                disabled={disabled}
              >
                <option value="">—</option>
                <option value="draft">draft</option>
                <option value="open">open</option>
                <option value="awarded">awarded</option>
                <option value="in-progress">in-progress</option>
                <option value="delivered">delivered</option>
                <option value="closed">closed</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Delivery Date
              </label>
              <input
                name="deliveryDate"
                type="date"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
                value={form.deliveryDate}
                onChange={onChange}
                disabled={disabled}
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {!isView && (
            <Button variant="default" onClick={handleSubmit} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ Página Tender Management ============ */
const TenderManagement = () => {
  const [currentLanguage, setCurrentLanguage] = useState("en");
  const [filters, setFilters] = useState({ search: "", status: "" });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("view"); // "view" | "edit" | "create"
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const lang = localStorage.getItem("language") || "en";
    setCurrentLanguage(lang);
  }, []);

  // Datos base
  const {
    rows: tenders = [],
    loading: l1,
    error: e1,
    refetch: refetchTenders,
  } = useSheet("tenders", mapTenders);

  const {
    rows: items = [],
    loading: l2,
    error: e2,
  } = useSheet("tender_items", mapTenderItems);

  const {
    rows: master = [],
    loading: l3,
    error: e3,
  } = useSheet("product_presentation_master", mapPresentationMaster);

  const loading = l1 || l2 || l3;
  const error = e1 || e2 || e3;

  // Mapa presentation_code -> package_units
  const packageUnitsMap = useMemo(() => {
    const m = new Map();
    (master || []).forEach((r) => {
      if (r.presentationCode) m.set(r.presentationCode, r.packageUnits || 1);
    });
    return m;
  }, [master]);

  // Agregados por tender
  const tenderAgg = useMemo(() => {
    const acc = new Map();
    (items || []).forEach((it) => {
      const pu = packageUnitsMap.get(it.presentationCode) ?? 1;
      // CLP = qty × (unit_price × package_units)
      const lineCLP =
        (it.awardedQty || 0) * (it.unitPrice || 0) * pu;

      const cur = acc.get(it.tenderId) || {
        productsCount: 0,
        totalValueClp: 0,
        stockCoverageDays: null,
      };

      cur.productsCount += 1;
      cur.totalValueClp += lineCLP;

      if (
        typeof it.stockCoverageDays === "number" &&
        !Number.isNaN(it.stockCoverageDays)
      ) {
        cur.stockCoverageDays =
          cur.stockCoverageDays == null
            ? it.stockCoverageDays
            : Math.min(cur.stockCoverageDays, it.stockCoverageDays);
      }

      acc.set(it.tenderId, cur);
    });
    return acc;
  }, [items, packageUnitsMap]);

  // Merge + filtros
  const rows = useMemo(() => {
    const merged = (tenders || []).map((t) => {
      const ag = tenderAgg.get(t.tenderId) || {};
      return {
        ...t,
        productsCount: ag.productsCount ?? t.productsCount ?? 0,
        totalValueClp: ag.totalValueClp ?? t.totalValue ?? 0,
        stockCoverageDays: ag.stockCoverageDays ?? t.stockCoverage ?? null,
      };
    });

    const s = (filters.search || "").toLowerCase();
    const st = (filters.status || "").toLowerCase();

    return merged.filter((r) => {
      const matchS =
        !s ||
        (r.tenderId || "").toLowerCase().includes(s) ||
        (r.title || "").toLowerCase().includes(s);
      const matchSt = !st || (r.status || "").toLowerCase() === st;
      return matchS && matchSt;
    });
  }, [tenders, tenderAgg, filters]);

  const openModal = (mode, tender = null) => {
    setModalMode(mode);
    setSelected(tender);
    setModalOpen(true);
  };

  const onSaved = () => {
    setModalOpen(false);
    refetchTenders?.(); // si tu hook lo soporta; si no, recarga
    if (!refetchTenders) window.location.reload();
  };

  const handleDelete = async (tender) => {
    if (!API_URL) {
      alert("Falta VITE_SHEETS_API_URL");
      return;
    }
    if (!tender?.tenderId) {
      alert("No hay Tender ID para borrar");
      return;
    }
    if (!confirm(`¿Eliminar tender ${tender.tenderId}?`)) return;

    try {
      const res = await fetch(
        `${API_URL}?route=write&action=delete&name=tenders`,
        {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ tender_id: tender.tenderId }),
        }
      );
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Error");
      onSaved();
    } catch (err) {
      console.error(err);
      alert(`Error al eliminar: ${String(err)}`);
    }
  };

  /* ===================== UI ===================== */
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Encabezado + acciones */}
          <div className="mb-6">
            <Breadcrumb />
            <div className="flex items-center justify-between mt-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Tender Management
                </h1>
                <p className="text-muted-foreground mt-2">
                  Administra y monitorea licitaciones; totales calculados con
                  awarded_qty × (unit_price × package_units).
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" iconName="Download" iconPosition="left">
                  Export
                </Button>
                <Button
                  variant="default"
                  iconName="Plus"
                  iconPosition="left"
                  onClick={() => openModal("create")}
                >
                  + New Tender
                </Button>
              </div>
            </div>
          </div>

          {/* Filtros (barra superior simple) */}
          <div className="bg-card rounded-lg border border-border p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Search</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
                  placeholder="Tender ID o Título"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, search: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Status</label>
                <select
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, status: e.target.value }))
                  }
                >
                  <option value="">All</option>
                  <option value="draft">draft</option>
                  <option value="open">open</option>
                  <option value="awarded">awarded</option>
                  <option value="in-progress">in-progress</option>
                  <option value="delivered">delivered</option>
                  <option value="closed">closed</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => setFilters({ search: "", status: "" })}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>

          {/* Tabla */}
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
                      <td colSpan={8} className="px-6 py-10 text-center">
                        Loading…
                      </td>
                    </tr>
                  )}

                  {error && !loading && (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-red-600">
                        {String(error)}
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    !error &&
                    rows.map((t) => (
                      <tr key={t.tenderId} className="hover:bg-muted/50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground">
                            {t.tenderId || "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-foreground">{t.title || "—"}</div>
                        </td>
                        <td className="px-6 py-4">{t.productsCount ?? 0}</td>
                        <td className="px-6 py-4 capitalize">{t.status || "—"}</td>
                        <td className="px-6 py-4">{fmtDate(t.deliveryDate)}</td>
                        <td className="px-6 py-4">
                          {t.stockCoverageDays == null || t.stockCoverageDays === ""
                            ? "—"
                            : `${t.stockCoverageDays} ${currentLanguage === "es" ? "días" : "days"}`}
                        </td>
                        <td className="px-6 py-4 font-medium text-foreground">
                          {fmtCLP(t.totalValueClp)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              iconName="Eye"
                              iconPosition="left"
                              onClick={() => openModal("view", t)}
                            >
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              iconName="Edit"
                              iconPosition="left"
                              onClick={() => openModal("edit", t)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              iconName="Trash2"
                              iconPosition="left"
                              onClick={() => handleDelete(t)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}

                  {!loading && !error && rows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center">
                        <div className="text-muted-foreground">
                          No tenders found.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal */}
          <TenderModal
            open={modalOpen}
            mode={modalMode}
            tender={selected}
            onClose={() => setModalOpen(false)}
            onSaved={onSaved}
          />
        </div>
      </main>
    </div>
  );
};

export default TenderManagement;
