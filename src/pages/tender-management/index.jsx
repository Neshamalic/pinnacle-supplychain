// src/pages/tender-management/index.jsx
import React, { useMemo, useState } from "react";

import Header from "../../components/ui/Header";
import Breadcrumb from "../../components/ui/Breadcrumb";
import Button from "../../components/ui/Button";
import Icon from "../../components/AppIcon";

import { useSheet } from "../../lib/sheetsApi";
import {
  mapTenders,
  mapTenderItems,
  mapPresentationMaster, // <- para leer package_units
} from "../../lib/adapters";

/* ------------------------ helpers UI ------------------------ */
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

/* ============================================================
   PAGE
   ============================================================ */
const TenderManagement = () => {
  const [currentLanguage] = useState(
    localStorage.getItem("language") || "en"
  );

  // 1) Datos base
  const {
    rows: tenders = [],
    loading: l1,
    error: e1,
  } = useSheet("tenders", mapTenders);

  const {
    rows: items = [],
    loading: l2,
    error: e2,
  } = useSheet("tender_items", mapTenderItems);

  // 2) Master de presentaciones para obtener "package_units"
  const {
    rows: master = [],
    loading: l3,
    error: e3,
  } = useSheet("product_presentation_master", mapPresentationMaster);

  // 3) Mapa presentation_code -> package_units
  const packageUnitsMap = useMemo(() => {
    const m = new Map();
    (master || []).forEach((r) => {
      if (r.presentationCode) {
        m.set(r.presentationCode, r.packageUnits || 1);
      }
    });
    return m;
  }, [master]);

  // 4) Agregados por tender: productsCount, totalValueClp, stockCoverageDays
  const tenderAgg = useMemo(() => {
    const acc = new Map();

    (items || []).forEach((it) => {
      const pu = packageUnitsMap.get(it.presentationCode) ?? 1;
      // **Regla solicitada**: CLP = qty * (unit_price * package_units)
      const lineCLP = (it.awardedQty || 0) * (it.unitPrice || 0) * pu;

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

  // 5) Merge de agregados con los tenders
  const tableRows = useMemo(() => {
    return (tenders || []).map((t) => {
      const ag = tenderAgg.get(t.tenderId) || {};
      return {
        ...t,
        productsCount: ag.productsCount ?? t.productsCount ?? 0,
        totalValueClp: ag.totalValueClp ?? t.totalValue ?? 0,
        stockCoverageDays:
          ag.stockCoverageDays ?? (t.stockCoverage || null),
      };
    });
  }, [tenders, tenderAgg]);

  const loading = l1 || l2 || l3;
  const error = e1 || e2 || e3;

  /* ------------------------ UI ------------------------ */
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Encabezado */}
          <div className="mb-6">
            <Breadcrumb />
            <div className="flex items-center justify-between mt-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {currentLanguage === "es"
                    ? "Tender Management"
                    : "Tender Management"}
                </h1>
                <p className="text-muted-foreground mt-2">
                  {currentLanguage === "es"
                    ? "Administra y monitorea las licitaciones CENABAST."
                    : "Manage and oversee all CENABAST tenders from registration through delivery tracking."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" iconName="Download" iconPosition="left">
                  {currentLanguage === "es" ? "Exportar" : "Export"}
                </Button>
                <Button variant="default" iconName="Plus" iconPosition="left">
                  {currentLanguage === "es" ? "Nueva Licitación" : "New Tender"}
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
                      Total Value
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
                      <td
                        colSpan={8}
                        className="px-6 py-10 text-center text-red-600"
                      >
                        {String(error)}
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    !error &&
                    tableRows.map((t) => (
                      <tr key={t.tenderId} className="hover:bg-muted/50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground">
                            {t.tenderId || "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-foreground">{t.title || "—"}</div>
                        </td>
                        <td className="px-6 py-4">
                          {t.productsCount ?? 0}
                        </td>
                        <td className="px-6 py-4 capitalize">
                          {t.status || "—"}
                        </td>
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
                            <Button variant="ghost" size="sm" iconName="Eye" iconPosition="left">
                              View
                            </Button>
                            <Button variant="ghost" size="sm" iconName="Edit" iconPosition="left">
                              Edit
                            </Button>
                            <Button variant="ghost" size="sm" iconName="Trash2" iconPosition="left">
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}

                  {!loading && !error && tableRows.length === 0 && (
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
        </div>
      </main>
    </div>
  );
};

export default TenderManagement;
