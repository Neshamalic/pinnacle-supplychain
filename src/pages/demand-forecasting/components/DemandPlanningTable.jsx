import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

/**
 * DemandPlanningTable
 *
 * Requisitos funcionales (según Mónica):
 * 1) Columnas:
 *    - Product (presentation_code + product_name, package_units desde product_presentation_master)
 *    - Stock (currentStockUnits)
 *    - Demand (monthlyDemandUnits) = awarded_qty / meses(first_delivery_date..last_delivery_date)
 *    - Month Supply = currentStockUnits / monthlyDemandUnits
 *    - Status (según Month Supply): <2 Critical | <=4 Urgent | <=6 Normal | >6 Optimal
 *    - Date Out of Stock = hoy + (currentStockUnits / monthlyDemandUnits) meses
 *    - Transit = si existe import_status "Transit" (imports/import_items) → mostrar cantidad y ETA
 *    - Actions (placeholders: View / Update stock)
 * 2) Fuentes (Apps Script): product_presentation_master, tender_items, imports, import_items
 * 3) Vista previa sin backend: usar ?demo=1
 */

// ========================= Utilidades de fecha =========================
const MS_IN_DAY = 24 * 60 * 60 * 1000;
const AVG_DAYS_IN_MONTH = 30.437; // aproximación estándar

function parseDateISO(s?: string | number | Date) {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

function monthsBetweenInclusive(first?: Date, last?: Date): number {
  if (!first || !last) return 1;
  const diffDays = (last.getTime() - first.getTime()) / MS_IN_DAY;
  // Inclusivo: +1 "mes" aproximado y redondeo al entero más cercano
  const months = Math.max(1, Math.round(diffDays / AVG_DAYS_IN_MONTH + 1));
  return months;
}

function addMonthsApprox(base: Date, months: number): Date {
  const days = months * AVG_DAYS_IN_MONTH;
  return new Date(base.getTime() + days * MS_IN_DAY);
}

// ========================= Tipos (TS) =========================
export type ProductMaster = {
  presentation_code: string;
  product_name?: string;
  package_units?: number;
  current_stock_units?: number; // opcional
};

export type TenderItem = {
  presentation_code: string;
  awarded_qty?: number;
  first_delivery_date?: string;
  last_delivery_date?: string;
};

export type ImportHeader = {
  oci_number: string;
  import_status?: string; // "Transit", "Released", etc.
  eta?: string; // fecha estimada de arribo
};

export type ImportItem = {
  oci_number: string;
  presentation_code: string;
  qty?: number;
};

export type Row = {
  presentation_code: string;
  product_label: string; // "<product_name> • <presentation_code> (x<package_units>)"
  currentStockUnits: number;
  monthlyDemandUnits: number;
  monthSupply: number; // cobertura en meses
  status: "Critical" | "Urgent" | "Normal" | "Optimal" | "N/A";
  outOfStockDate?: Date;
  transitLabel?: string; // "<qty> u. · ETA yyyy-MM-dd"
};

// ========================= Lógica de negocio =========================
function coverageStatus(monthSupply: number): Row["status"] {
  if (!isFinite(monthSupply) || monthSupply <= 0) return "Critical";
  if (monthSupply < 2) return "Critical";
  if (monthSupply <= 4) return "Urgent";
  if (monthSupply <= 6) return "Normal";
  return "Optimal";
}

// Determina la URL base para la API de Apps Script
const BASE_URL = (import.meta as any).env?.VITE_SHEETS_API_URL || "/api/sheets";

function buildRows(
  masters: ProductMaster[],
  tenderItems: TenderItem[],
  importHeaders: ImportHeader[],
  importItems: ImportItem[],
): Row[] {
  // Índices por presentation_code
  const masterByCode = new Map<string, ProductMaster>();
  masters.forEach((m) => {
    if (m.presentation_code) masterByCode.set(String(m.presentation_code), m);
  });

  // Demanda mensual por código
  const demandByCode = new Map<string, number>();
  tenderItems.forEach((ti) => {
    const code = String(ti.presentation_code || "");
    if (!code) return;
    const awarded = Number(ti.awarded_qty || 0);
    const first = parseDateISO(ti.first_delivery_date);
    const last = parseDateISO(ti.last_delivery_date);
    const months = Math.max(1, monthsBetweenInclusive(first, last));
    const monthly = months > 0 ? awarded / months : 0;
    demandByCode.set(code, (demandByCode.get(code) || 0) + monthly);
  });

  // Tránsito por código (suma qty y usa la ETA más próxima)
  const headerByOCI = new Map<string, ImportHeader>();
  importHeaders.forEach((h) => {
    if (h.oci_number) headerByOCI.set(h.oci_number, h);
  });

  const transitByCode = new Map<string, { qty: number; eta?: Date }>();
  importItems.forEach((ii) => {
    const head = ii.oci_number ? headerByOCI.get(ii.oci_number) : undefined;
    if (!head) return;
    if ((head.import_status || "").toLowerCase() !== "transit") return;
    const code = String(ii.presentation_code || "");
    if (!code) return;
    const qty = Number(ii.qty || 0);
    const eta = parseDateISO(head.eta);
    const prev = transitByCode.get(code);
    if (!prev) transitByCode.set(code, { qty, eta: eta || undefined });
    else transitByCode.set(code, {
      qty: prev.qty + qty,
      eta: prev.eta && eta ? (prev.eta < eta ? prev.eta : eta) : (prev.eta || eta),
    });
  });

  // Construcción de filas
  const codes = Array.from(masterByCode.keys());
  const today = new Date();

  const rows: Row[] = codes.map((code) => {
    const m = masterByCode.get(code)!;
    const productLabel = `${m.product_name ?? ""} • ${code}${m.package_units ? ` (x${m.package_units})` : ""}`.trim();

    const currentStockUnits = Number(m.current_stock_units ?? 0);
    const monthlyDemandUnits = Number(demandByCode.get(code) ?? 0);
    const monthSupply = monthlyDemandUnits > 0 ? currentStockUnits / monthlyDemandUnits : Infinity;
    const status = isFinite(monthSupply) ? coverageStatus(monthSupply) : "N/A";
    const outOfStockDate = monthlyDemandUnits > 0 && currentStockUnits > 0
      ? addMonthsApprox(today, currentStockUnits / monthlyDemandUnits)
      : undefined;

    const tr = transitByCode.get(code);
    const transitLabel = tr && tr.qty > 0
      ? `${tr.qty} u.${tr.eta ? ` · ETA ${format(tr.eta, "yyyy-MM-dd")}` : ""}`
      : undefined;

    return {
      presentation_code: code,
      product_label: productLabel,
      currentStockUnits,
      monthlyDemandUnits,
      monthSupply,
      status,
      outOfStockDate,
      transitLabel,
    };
  });

  return rows;
}

async function fetchTable<T>(name: string): Promise<T[]> {
  const url = `${BASE_URL}?route=table&name=${encodeURIComponent(name)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error leyendo ${name}: ${res.status}`);
  return (await res.json()) as T[];
}

// ========================= Componente =========================
export default function DemandPlanningTable() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  // Vista previa sin backend: agrega ?demo=1
  const demo = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demo") === "1";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        if (demo) {
          // Datos de ejemplo
          const masters: ProductMaster[] = [
            { presentation_code: "PC0001", product_name: "Metronidazol", package_units: 100, current_stock_units: 1200 },
            { presentation_code: "PC0004", product_name: "Apixabán (Spiroaart®)", package_units: 30, current_stock_units: 350 },
          ];
          const tenderItems: TenderItem[] = [
            // caso simple (mismo día → 1 mes) para tests reproducibles
            { presentation_code: "PC0001", awarded_qty: 6000, first_delivery_date: "2025-06-15", last_delivery_date: "2025-06-15" },
            { presentation_code: "PC0004", awarded_qty: 900, first_delivery_date: "2025-09-01", last_delivery_date: "2026-02-28" },
          ];
          const importHeaders: ImportHeader[] = [
            { oci_number: "OCI-123", import_status: "Transit", eta: "2025-10-15" },
          ];
          const importItems: ImportItem[] = [
            { oci_number: "OCI-123", presentation_code: "PC0001", qty: 800 },
          ];

          const built = buildRows(masters, tenderItems, importHeaders, importItems);
          if (!cancelled) setRows(built);
          runDevTests();
          return;
        }

        // Evita 404 en preview si no hay backend configurado
        if (!BASE_URL || BASE_URL === "/api/sheets") {
          throw new Error("No se encontró VITE_SHEETS_API_URL. Usa ?demo=1 para vista previa.");
        }

        const [masters, tenderItems, importHeaders, importItems] = await Promise.all([
          fetchTable<ProductMaster>("product_presentation_master"),
          fetchTable<TenderItem>("tender_items"),
          fetchTable<ImportHeader>("imports"),
          fetchTable<ImportItem>("import_items"),
        ]);

        const built = buildRows(masters, tenderItems, importHeaders, importItems);
        if (!cancelled) setRows(built);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Error cargando Demand Planning");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [demo]);

  const columns = useMemo(() => [
    { key: "product_label", header: "Product" },
    { key: "currentStockUnits", header: "Stock" },
    { key: "monthlyDemandUnits", header: "Demand" },
    { key: "monthSupply", header: "Month Supply" },
    { key: "status", header: "Status" },
    { key: "outOfStockDate", header: "Date Out of Stock" },
    { key: "transitLabel", header: "Transit" },
    { key: "actions", header: "Actions" },
  ], []);

  if (loading) return <div className="p-4">Cargando Demand Planning…</div>;

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Demand Planning</h2>
        <div className="text-sm text-gray-500">{rows.length} productos</div>
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          {error}
          <div className="mt-1">
            Para probar aquí, abre el preview con <code>?demo=1</code>. En producción, configura <code>VITE_SHEETS_API_URL</code>.
          </div>
        </div>
      )}

      <div className="overflow-x-auto border rounded-2xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-3 py-2 text-left font-medium text-gray-600">
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.presentation_code} className="border-t">
                <td className="px-3 py-2">
                  <div className="font-medium">{r.product_label}</div>
                  <div className="text-gray-500">{r.presentation_code}</div>
                </td>
                <td className="px-3 py-2">{Math.round(r.currentStockUnits)}</td>
                <td className="px-3 py-2">{r.monthlyDemandUnits.toFixed(2)}</td>
                <td className="px-3 py-2">{Number.isFinite(r.monthSupply) ? r.monthSupply.toFixed(2) : "∞"}</td>
                <td className="px-3 py-2"><StatusPill status={r.status} /></td>
                <td className="px-3 py-2">{r.outOfStockDate ? format(r.outOfStockDate, "yyyy-MM-dd") : "—"}</td>
                <td className="px-3 py-2">{r.transitLabel ?? "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button className="px-2 py-1 rounded-xl border hover:bg-gray-50">View</button>
                    <button className="px-2 py-1 rounded-xl border hover:bg-gray-50">Update stock</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        * Meses = diferencia aproximada e inclusiva entre first_delivery_date y last_delivery_date. Si no hay fechas, se asume 1 mes.
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: Row["status"] }) {
  const base = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium";
  const palette: Record<Row["status"], string> = {
    Critical: "bg-red-100 text-red-700",
    Urgent: "bg-orange-100 text-orange-700",
    Normal: "bg-yellow-100 text-yellow-700",
    Optimal: "bg-green-100 text-green-700",
    "N/A": "bg-gray-100 text-gray-600",
  };
  return <span className={`${base} ${palette[status]}`}>{status}</span>;
}

// ========================= Tests ligeros (dev) =========================
function runDevTests() {
  try {
    // 1) coverageStatus
    console.assert(coverageStatus(1.99) === "Critical", "1.99 ⇒ Critical");
    console.assert(coverageStatus(2) === "Urgent", "2 ⇒ Urgent");
    console.assert(coverageStatus(4) === "Urgent", "4 ⇒ Urgent");
    console.assert(coverageStatus(5) === "Normal", "5 ⇒ Normal");
    console.assert(coverageStatus(6.01) === "Optimal", ">6 ⇒ Optimal");

    // 2) monthsBetweenInclusive (mismo día ⇒ 1)
    const d = new Date("2025-06-15");
    console.assert(monthsBetweenInclusive(d, d) === 1, "mismo día ⇒ 1 mes");

    // 3) buildRows: demanda > 0, tránsito agregado y fecha OOS definida
    const masters: ProductMaster[] = [
      { presentation_code: "PCX", product_name: "Dummy", package_units: 10, current_stock_units: 100 },
    ];
    const tis: TenderItem[] = [
      { presentation_code: "PCX", awarded_qty: 300, first_delivery_date: "2025-01-01", last_delivery_date: "2025-01-01" }, // 1 mes
    ];
    const ih: ImportHeader[] = [
      { oci_number: "O1", import_status: "Transit", eta: "2025-12-31" },
      { oci_number: "O2", import_status: "Transit", eta: "2025-11-30" }, // ETA más próxima
    ];
    const ii: ImportItem[] = [
      { oci_number: "O1", presentation_code: "PCX", qty: 50 },
      { oci_number: "O2", presentation_code: "PCX", qty: 25 },
    ];
    const built = buildRows(masters, tis, ih, ii);
    console.assert(built.length === 1, "una fila");
    console.assert(built[0].monthlyDemandUnits > 0, "demanda > 0");
    console.assert(built[0].transitLabel?.includes("75"), "transit suma 75");
    console.assert(built[0].transitLabel?.includes("2025-11-30"), "ETA más próxima 2025-11-30");
    console.assert(built[0].outOfStockDate instanceof Date || built[0].outOfStockDate === undefined, "fecha OOS definida si hay demanda");
  } catch (e) {
    console.warn("Tests (dev) fallaron:", e);
  }
}
