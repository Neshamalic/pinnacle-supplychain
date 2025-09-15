// src/pages/tender-management/components/TenderTable.jsx
import React, { useMemo } from "react";
import Button from "@/components/ui/Button";
import TenderStatusBadge from "./TenderStatusBadge";
import StockCoverageBadge from "./StockCoverageBadge";
import { useSheet } from "@/lib/sheetsApi";
import { mapTenders, mapTenderItems } from "@/lib/adapters";
import { usePresentationCatalog } from "@/lib/catalog";

/* ===== helpers de formato / parse ===== */
const fmtCLP = (v) =>
  `CLP ${Number(v || 0).toLocaleString("es-CL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const n = (v) => {
  if (v == null || v === "") return 0;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v).replace(/\./g, "").replace(/,/g, ".");
  const x = parseFloat(s);
  return Number.isFinite(x) ? x : 0;
};

const rangesOverlap = (a1, a2, b1, b2) => {
  const s1 = a1 ? a1.getTime() : -Infinity;
  const e1 = a2 ? a2.getTime() : Infinity;
  const s2 = b1 ? b1.getTime() : -Infinity;
  const e2 = b2 ? b2.getTime() : Infinity;
  return s1 <= e2 && s2 <= e1;
};

export default function TenderTable({
  filters = {},
  onView = () => {},
  onEdit = () => {},
}) {
  // Datos base
  const { rows: tenders = [], loading: loadingTenders } = useSheet("tenders", mapTenders);
  const { rows: tenderItemsRaw = [], loading: loadingItems } = useSheet("tender_items", mapTenderItems);

  // Enrichment para traer packageUnits desde el Product/Presentation master
  const { enrich } = usePresentationCatalog();
  const tenderItems = useMemo(() => enrich(tenderItemsRaw), [tenderItemsRaw, enrich]);

  // Agregados por tenderId (cálculo idéntico al Overview)
  const aggregatesByTender = useMemo(() => {
    const map = new Map();

    for (const it of tenderItems) {
      const tid = (it.tenderId || "").trim();
      if (!tid) continue;

      // qty y price robustos
      const qty = n(it.awardedQty ?? it.qty ?? it._raw?.awarded_qty ?? it._raw?.quantity);
      const price = n(it.unitPrice ?? it._raw?.unit_price ?? it._raw?.price);

      // packageUnits —> usar enrich y caídas de respaldo al _raw
      const pupRaw =
        it.packageUnits ??
        it._raw?.package_units ??
        it._raw?.units_per_package ??
        1;
      const packageUnits = n(pupRaw) || 1;

      // línea EXACTA como Overview: qty * unitPrice * packageUnits
      const lineTotalCLP = qty * price * packageUnits;

      const current = map.get(tid) || {
        products: 0,
        totalCLP: 0,
        minStockCoverage: null,
        periods: [],
      };

      current.totalCLP += lineTotalCLP;
      current.products += 1;

      const cov =
        it.stockCoverageDays != null
          ? n(it.stockCoverageDays)
          : n(it._raw?.stock_coverage_days);
      if (cov) {
        if (current.minStockCoverage == null) current.minStockCoverage = cov;
        else current.minStockCoverage = Math.min(current.minStockCoverage, cov);
      }

      // Guardamos el periodo de contrato a nivel ítem (si existe) para filtrar
      const start =
        toDate(it.contractStart) ||
        toDate(it._raw?.contract_start) ||
        null;
      const end =
        toDate(it.contractEnd) ||
        toDate(it._raw?.contract_end) ||
        null;

      if (start || end) current.periods.push({ start, end });

      map.set(tid, current);
    }

    return map;
  }, [tenderItems]);

  // Filtros
  const q = (filters.q || filters.search || "").toLowerCase();
  const wantedStatus = (filters.status || filters.state || "all").toLowerCase();
  const fromDate = toDate(filters.from || filters.fromDate);
  const toDateF = toDate(filters.to || filters.toDate);

  // Construimos filas finales (una por Tender ID, agrupado)
  const rows = useMemo(() => {
    return (tenders || [])
      .map((t) => {
        const agg = aggregatesByTender.get(t.tenderId) || {
          products: 0,
          totalCLP: 0,
          minStockCoverage: null,
          periods: [],
        };

        // filtro por periodo de contrato (si el usuario eligió)
        const passesPeriod =
          fromDate || toDateF
            ? (agg.periods.length
                ? agg.periods.some((p) => rangesOverlap(fromDate, toDateF, p.start, p.end))
                : true)
            : true;

        // buscador
        const matchesSearch =
          !q ||
          (t.tenderId && t.tenderId.toLowerCase().includes(q)) ||
          (t.title && t.title.toLowerCase().includes(q));

        // estado
        const st = (t.status || "").toLowerCase();
        const matchesStatus = wantedStatus === "all" || wantedStatus === st;

        if (!passesPeriod || !matchesSearch || !matchesStatus) return null;

        return {
          tender: t,
          products: agg.products,
          totalCLP: agg.totalCLP,
          stockCoverageDays: agg.minStockCoverage,
        };
      })
      .filter(Boolean);
  }, [tenders, aggregatesByTender, q, wantedStatus, fromDate, toDateF]);

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-3">Tender ID</th>
            <th className="text-left px-4 py-3">Title</th>
            <th className="text-left px-4 py-3">Products</th>
            <th className="text-left px-4 py-3">Status</th>
            <th className="text-left px-4 py-3">Delivery Date</th>
            <th className="text-left px-4 py-3">Stock Coverage</th>
            <th className="text-left px-4 py-3">Total Value</th>
            <th className="text-left px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ tender, products, totalCLP, stockCoverageDays }) => (
            <tr key={tender.tenderId} className="border-t">
              <td className="px-4 py-3 font-medium">{tender.tenderId}</td>
              <td className="px-4 py-3">{tender.title || "—"}</td>
              <td className="px-4 py-3">{products}</td>
              <td className="px-4 py-3">
                <TenderStatusBadge status={tender.status} />
              </td>
              <td className="px-4 py-3">
                {tender.deliveryDate
                  ? new Date(tender.deliveryDate).toLocaleDateString("es-CL")
                  : "—"}
              </td>
              <td className="px-4 py-3">
                <StockCoverageBadge days={stockCoverageDays} />
              </td>
              <td className="px-4 py-3">{fmtCLP(totalCLP)}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => onView(tender)}>View</Button>
                  <Button size="sm" variant="secondary" onClick={() => onEdit(tender)}>Edit</Button>
                </div>
              </td>
            </tr>
          ))}

          {(loadingTenders || loadingItems) && (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                Loading…
              </td>
            </tr>
          )}

          {!loadingTenders && !loadingItems && rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                No tenders found with current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
