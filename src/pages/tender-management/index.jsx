// src/pages/tender-management/index.jsx
import React, { useMemo, useState } from "react";

// UI base
import Header from "../../components/ui/Header";
import Breadcrumb from "../../components/ui/Breadcrumb";
import Button from "../../components/ui/Button";
import Icon from "../../components/AppIcon";

// Datos desde Google Sheets
import { useSheet } from "../../lib/sheetsApi";
import { mapTenders, mapTenderItems } from "../../lib/adapters";

// -------------------------------
// Utilidades de formato
// -------------------------------
const fmtDate = (value, locale = "en-US") => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
};

const fmtMoney = (num, locale = "en-US", currency = "CLP") => {
  const n = Number.isFinite(+num) ? +num : 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(n);
};

// -------------------------------
// Página
// -------------------------------
const TenderManagement = () => {
  const [language, setLanguage] = useState(() => localStorage.getItem("language") || "en");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Carga de datos (defensas contra respuestas que no son array)
  const {
    rows: rawTenders = [],
    loading: loadingTenders,
    error: errorTenders
  } = useSheet("tenders", mapTenders);

  const {
    rows: rawItems = [],
    loading: loadingItems,
    error: errorItems
  } = useSheet("tender_items", mapTenderItems);

  const locale = language === "es" ? "es-CL" : "en-US";
  const t = (en, es) => (language === "es" ? es : en);

  // Agrupar items por tender_id para contar productos y (si existiera) sumar valor
  const itemsByTender = useMemo(() => {
    const map = new Map();
    (Array.isArray(rawItems) ? rawItems : []).forEach((it) => {
      const key = it?.tender_id || it?.tenderId || "";
      if (!key) return;
      if (!map.has(key)) map.set(key, { count: 0, valueClp: 0 });
      const agg = map.get(key);
      agg.count += 1;
      // si el item trae monto, lo sumamos (si no, queda 0)
      const itemValue = Number.isFinite(+it?.total_value_clp) ? +it.total_value_clp : 0;
      agg.valueClp += itemValue;
    });
    return map;
  }, [rawItems]);

  // Normalizamos los tenders y les inyectamos productos y total
  const tenders = useMemo(() => {
    const src = Array.isArray(rawTenders) ? rawTenders : [];
    return src.map((tender) => {
      const id = tender?.tender_id || tender?.id || "";
      const agg = itemsByTender.get(id) || { count: 0, valueClp: 0 };

      // preferimos el total que venga en el tender; si no, usamos la suma por items
      const tenderTotal = Number.isFinite(+tender?.total_value_clp) ? +tender.total_value_clp : null;
      const totalClp = tenderTotal != null ? tenderTotal : agg.valueClp;

      return {
        ...tender,
        _products_count: agg.count,
        _total_value_clp: totalClp
      };
    });
  }, [rawTenders, itemsByTender]);

  // Métricas superiores (tarjetas)
  const summary = useMemo(() => {
    const src = Array.isArray(tenders) ? tenders : [];
    const active = src.filter((t) => (t?.status || "").toLowerCase() !== "awarded").length;
    const awarded = src.filter((t) => (t?.status || "").toLowerCase() === "awarded").length;
    const inDelivery = src.filter((t) => (t?.status || "").toLowerCase().includes("delivery")).length;
    const critical = src.filter((t) => {
      const d = Number.isFinite(+t?.stock_coverage_days) ? +t.stock_coverage_days : null;
      return d != null && d <= 15;
    }).length;
    return { active, awarded, inDelivery, critical };
  }, [tenders]);

  // Filtros + búsqueda
  const filtered = useMemo(() => {
    const src = Array.isArray(tenders) ? tenders : [];
    const s = (search || "").toLowerCase();

    return src.filter((row) => {
      if (s) {
        const a = (row?.tender_id || "").toLowerCase();
        const b = (row?.title || "").toLowerCase();
        if (!a.includes(s) && !b.includes(s)) return false;
      }
      if (statusFilter && row?.status !== statusFilter) return false;
      return true;
    });
  }, [tenders, search, statusFilter]);

  // Errores / Loading
  if (loadingTenders || loadingItems) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-6 py-10">Loading…</div>
        </main>
      </div>
    );
  }

  if (errorTenders || errorItems) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-6 py-10 text-red-600">
            {String(errorTenders || errorItems)}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Encabezado de página */}
          <div className="mb-6">
            <Breadcrumb />
            <div className="flex items-center justify-between mt-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {t("Tender Management", "Tender Management")}
                </h1>
                <p className="text-muted-foreground mt-2">
                  {t(
                    "Manage and oversee all CENABAST tenders from registration through delivery tracking.",
                    "Manage and oversee all CENABAST tenders from registration through delivery tracking."
                  )}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button type="button" variant="outline" iconName="Download" iconPosition="left">
                  {t("Export", "Export")}
                </Button>
                <Button type="button" variant="default" iconName="Plus" iconPosition="left">
                  {t("New Tender", "New Tender")}
                </Button>
              </div>
            </div>
          </div>

          {/* Tarjetas resumen */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="text-sm text-muted-foreground">{t("Active", "Active")}</div>
              <div className="text-3xl font-bold">{summary.active}</div>
            </div>
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="text-sm text-muted-foreground">{t("Awarded", "Awarded")}</div>
              <div className="text-3xl font-bold">{summary.awarded}</div>
            </div>
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="text-sm text-muted-foreground">{t("In Delivery", "In Delivery")}</div>
              <div className="text-3xl font-bold">{summary.inDelivery}</div>
            </div>
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="text-sm text-muted-foreground">{t("Critical", "Critical")}</div>
              <div className="text-3xl font-bold">{summary.critical}</div>
            </div>
          </div>

          {/* Layout: filtros + tabla */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Sidebar de filtros */}
            <aside className="md:col-span-1 space-y-6">
              <div className="bg-card rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">{t("Filters", "Filters")}</h3>

                <label className="text-xs font-medium text-muted-foreground">{t("Search", "Search")}</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("Tender ID or Title…", "Tender ID or Title…")}
                  className="mt-1 mb-4 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
                />

                <label className="text-xs font-medium text-muted-foreground">{t("Status", "Status")}</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
                >
                  <option value="">{t("All", "All")}</option>
                  {Array.from(
                    new Set((Array.isArray(tenders) ? tenders : []).map((t) => t?.status).filter(Boolean))
                  ).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Marcos listos para más filtros (categoría, packaging, etc.) */}
              <div className="bg-card rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">{t("Product Category", "Product Category")}</h3>
                <p className="text-xs text-muted-foreground">
                  {t("Coming soon", "Próximamente")}
                </p>
              </div>

              <div className="bg-card rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">{t("Contract Period", "Contract Period")}</h3>
                <p className="text-xs text-muted-foreground">
                  {t("Coming soon", "Próximamente")}
                </p>
              </div>
            </aside>

            {/* Tabla */}
            <section className="md:col-span-3">
              <div className="bg-card rounded-lg border border-border shadow-soft overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted border-b border-border">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-medium text-foreground">{t("Tender ID", "Tender ID")}</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-foreground">{t("Title", "Title")}</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-foreground">{t("Products", "Products")}</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-foreground">{t("Status", "Status")}</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-foreground">{t("Delivery Date", "Delivery Date")}</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-foreground">{t("Stock Coverage", "Stock Coverage")}</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-foreground">{t("Total Value", "Total Value")}</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-foreground">{t("Actions", "Actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(Array.isArray(filtered) ? filtered : []).map((row) => (
                        <tr key={row?.tender_id || row?.id || crypto.randomUUID()} className="hover:bg-muted/50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-foreground">{row?.tender_id || "—"}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-foreground">{row?.title || "—"}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-foreground">{row?._products_count ?? 0}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm">{row?.status || "—"}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-foreground">{fmtDate(row?.delivery_date, locale)}</div>
                          </td>
                          <td className="px-6 py-4">
                            {Number.isFinite(+row?.stock_coverage_days) ? (
                              <div className="inline-flex items-center px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                                {+row.stock_coverage_days} {t("days", "days")}
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-foreground">
                              {row?._total_value_clp != null ? fmtMoney(row._total_value_clp, locale, "CLP") : "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm" iconName="Pencil" iconPosition="left">
                                {t("Edit", "Edit")}
                              </Button>
                              <Button variant="ghost" size="sm" iconName="Trash2" iconPosition="left">
                                {t("Delete", "Delete")}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {(Array.isArray(filtered) ? filtered.length : 0) === 0 && (
                  <div className="text-center py-12">
                    <Icon name="Package" size={48} className="mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      {t("No tenders found", "No tenders found")}
                    </h3>
                    <p className="text-muted-foreground">
                      {t("Try adjusting the filters to see more results.", "Try adjusting the filters to see more results.")}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TenderManagement;
