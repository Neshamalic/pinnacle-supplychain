// src/pages/tender-management/components/TenderTable.jsx
import React, { useMemo } from "react";
import Button from "@/components/ui/Button";
import TenderStatusBadge from "./TenderStatusBadge";
import StockCoverageBadge from "./StockCoverageBadge";
import { useSheet } from "@/lib/sheetsApi";
import { mapTenders, mapTenderItems } from "@/lib/adapters";
import { usePresentationCatalog } from "@/lib/catalog";

/**
 * Formatea CLP exactamente como el Overview
 */
const fmtCLP = (v) =>
  `CLP ${Number(v || 0).toLocaleString("es-CL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

/**
 * Convierte a Date o null
 */
const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Determina si un rango [a1, a2] se solapa con [b1, b2]
 */
const rangesOverlap = (a1, a2, b1, b2) => {
  const s1 = a1 ? a1.getTime() : -Infinity;
  const e1 = a2 ? a2.getTime() : Infinity;
  const s2 = b1 ? b1.getTime() : -Infinity;
  const e2 = b2 ? b2.getTime() : Infinity;
  return s1 <= e2 && s2 <= e1;
};

export default function TenderTable({
  // filtros que vienen del toolbar/filtros
  filters = {},
  // callbacks que usa la tabla
  onView = () => {},
  onEdit = () => {},
}) {
  // 1) Leemos masters
  const { rows: tenders = [], loading: loadingTenders } = useSheet("tenders", mapTenders);
  const { rows: tenderItemsRaw = [], loading: loadingItems } = useSheet("tender_items", mapTenderItems);

  // 2) Enriquecemos con product/presentation master (packageUnits)
  const { enrich } = usePresentationCatalog();
  const tenderItems = useMemo(() => enrich(tenderItemsRaw), [tenderItemsRaw, enrich]);

  // 3) Armamos agregados por Tender
  const aggregatesByTender = useMemo(() => {
    const map = new Map();

    for (const it of tenderItems) {
      const tid = (it.tenderId || "").trim();
      if (!tid) continue;

      // total por ítem igual que en Overview: qty * unitPrice * packageUnits
      const unitsPerPack = Number(it.packageUnits || 1);
      const lineTotalCLP = Number(it.awardedQty || 0) * Number(it.unitPrice || 0) * unitsPerPack;

      const current = map.get(tid) || {
        products: 0,
        totalCLP: 0,
        // usamos la menor cobertura > 0 si existe
        minStockCoverage: null,
        // para el filtro por periodo de contrato
        periods: [], // [{start: Date|null, end: Date|null}]
      };

      current.totalCLP += lineTotalCLP;
      current.products += 1;

      // cobertura: tomamos el menor valor no nulo
      const cov = it.stockCoverageDays != null ? Number(it.stockCoverageDays) : null;
      if (cov != null) {
        if (current.minStockCoverage == null) current.minStockCoverage = cov;
        else current.minStockCoverage = Math.min(current.minStockCoverage, cov);
      }

      // período de contrato a nivel ítem (si existen en la hoja)
      const start = toDate(it.contractStart);
      const end = toDate(it.contractEnd);
      if (start || end) current.periods.push({ start, end });

      map.set(tid, current);
    }

    return map;
  }, [tenderItems]);

  // 4) Preparamos filtros
  const q = (filters.q || filters.search || "").toLowerCase();
  const wantedStatus = (filters.status || filters.state || "all").toLowerCase();

  const fromDate = toDate(filters.from || filters.fromDate);
  const toDateF = toDate(filters.to || filters.toDate);

  // 5) Construimos las filas (una por Tender real, agrupadas por tenderId)
  const rows = useMemo(() => {
    return (tenders || [])
      .map((t) => {
        const agg = aggregatesByTender.get(t.tenderId) || {
          products: 0,
          totalCLP: 0,
          minStockCoverage: null,
          periods: [],
        };

        // si no hay periodos en items, igual lo dejamos entrar por defecto
        const passesPeriod =
          fromDate || toDateF
            ? // si setearon rango, aceptamos si hay solape con cualquier periodo del tender
              (agg.periods.length
                ? agg.periods.some((p) => rangesOverlap(fromDate, toDateF, p.start, p.end))
                : true)
            : true;

        // buscador por tenderId o title
        const matchesSearch =
          !q ||
          (t.tenderId && t.tenderId.toLowerCase().includes(q)) ||
          (t.title && t.title.toLowerCase().includes(q));

        // filtro por status
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

  // 6) Pintamos tabla
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
                  <Button size="sm" onClick={() => onView(tender)}>
                    View
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => onEdit(tender)}>
                    Edit
                  </Button>
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
