import React, { useEffect, useMemo, useState } from "react";

/**
 * DemandPlanningTable (versión JS)
 *
 * Cambios solicitados por Mónica:
 * - Stock viene de la hoja "demand" (campo current_stock_units por presentation_code).
 * - Cálculo de meses: meses calendario exactos e inclusivos (ej: Ene a Mar = 3).
 * - Status: <2 Critical | 2..4 Urgent | >4..6 Normal | >6 Optimal.
 * - Transit: case-insensitive ("transit"/"Transit"/etc.) y listado detallado por OCI con qty y ETA.
 * - Evitar 404 usando el proxy /api/gas-proxy por defecto.
 */

// ========================= Config =========================
const BASE_URL = (import.meta?.env?.VITE_SHEETS_API_URL) || "/api/gas-proxy";

// ========================= Utilidades de fecha =========================
function parseDateISO(x) {
  if (!x) return undefined;
  const d = new Date(x);
  return isNaN(d.getTime()) ? undefined : d;
}

// Meses calendario exactos (inclusivo): 2025-01-01 a 2025-03-31 => 3 meses
function monthsCalendarInclusive(first, last) {
  if (!first || !last) return 1;
  const y = last.getFullYear() - first.getFullYear();
  const m = last.getMonth() - first.getMonth();
  const total = y * 12 + m + 1;
  return Math.max(1, total);
}

// Suma "meses" como fracción para estimar fecha de quiebre (aprox. 30.437 días/mes)
function addMonthsApprox(base, monthsFloat) {
  const DAYS_PER_MONTH = 30.437;
  const ms = monthsFloat * DAYS_PER_MONTH * 24 * 60 * 60 * 1000;
  return new Date(base.getTime() + ms);
}

function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ========================= Lectura de datos =========================
async function readTable(name) {
  const url = `${BASE_URL}?route=table&name=${encodeURIComponent(name)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error leyendo ${name}: ${res.status}`);
  return await res.json();
}

// ========================= Reglas de negocio =========================
function coverageStatus(months) {
  // <2 ⇒ Critical, 2..4 ⇒ Urgent, >4..6 ⇒ Normal, >6 ⇒ Optimal
  if (!isFinite(months) || months <= 0) return "Critical";
  if (months < 2) return "Critical";
  if (months <= 4) return "Urgent";
  if (months <= 6) return "Normal";
  return "Optimal";
}

function buildRows({ catalog, demandSheet, tenderItems, importHeaders, importItems }) {
  // Catálogo por código
  const catByCode = new Map();
  for (const c of catalog || []) {
    const code = String(c.presentation_code || "").trim();
    if (!code) continue;
    catByCode.set(code, {
      product_name: c.product_name || "",
      package_units: Number(c.package_units || 0),
    });
  }

  // Stock por código desde hoja demand
  const stockByCode = new Map();
  for (const d of demandSheet || []) {
    const code = String(d.presentation_code || d.presentationCode || "").trim();
    if (!code) continue;
    const stock = Number(d.current_stock_units || d.currentStockUnits || 0);
    stockByCode.set(code, (stockByCode.get(code) || 0) + stock);
  }

  // Demanda mensual por tender_items (meses calendario exactos)
  const monthlyDemandByCode = new Map();
  for (const ti of tenderItems || []) {
    const code = String(ti.presentation_code || ti.presentationCode || "").trim();
    if (!code) continue;
    const awarded = Number(ti.awarded_qty || 0);
    const first = parseDateISO(ti.first_delivery_date);
    const last = parseDateISO(ti.last_delivery_date);
    const months = monthsCalendarInclusive(first, last);
    const monthly = months > 0 ? awarded / months : 0;
    monthlyDemandByCode.set(code, (monthlyDemandByCode.get(code) || 0) + monthly);
  }

  // Encabezados de importaciones por OCI
  const headerByOCI = new Map();
  for (const h of importHeaders || []) {
    if (!h.oci_number) continue;
    headerByOCI.set(String(h.oci_number), h);
  }

  // Tránsito detallado por código (case-insensitive)
  const transitByCode = new Map(); // code => [{oci, qty, eta}, ...]
  for (const ii of importItems || []) {
    const oci = String(ii.oci_number || "").trim();
    const head = headerByOCI.get(oci);
    if (!head) continue;
    const status = String(head.import_status || "").toLowerCase();
    if (status !== "transit") continue; // acepta Transit/transit/TRANSIT
    const code = String(ii.presentation_code || "").trim();
    if (!code) continue;
    const qty = Number(ii.qty || 0);
    const eta = parseDateISO(head.eta);
    const list = transitByCode.get(code) || [];
    list.push({ oci, qty, eta });
    transitByCode.set(code, list);
  }

  // Construcción de filas
  const allCodes = new Set([
    ...Array.from(catByCode.keys()),
    ...Array.from(stockByCode.keys()),
    ...Array.from(monthlyDemandByCode.keys()),
  ]);

  const today = new Date();
  const rows = Array.from(allCodes).map((code) => {
    const stock = Number(stockByCode.get(code) || 0);
    const demandM = Number(monthlyDemandByCode.get(code) || 0);
    const months = demandM > 0 ? stock / demandM : Infinity;

    const cat = catByCode.get(code) || {};
    const productLabel = `${cat.product_name || ""} • ${code}${cat.package_units ? ` (x${cat.package_units})` : ""}`.trim();

    const outOfStockDate = demandM > 0 && stock > 0 ? addMonthsApprox(today, stock / demandM) : undefined;

    const trList = transitByCode.get(code) || [];
    trList.sort((a, b) => {
      const ta = a.eta ? a.eta.getTime() : Infinity;
      const tb = b.eta ? b.eta.getTime() : Infinity;
      return ta - tb;
    });

    return {
      presentation_code: code,
      product_label: productLabel,
      currentStockUnits: stock,
      monthlyDemandUnits: demandM,
      monthSupply: months,
      status: coverageStatus(months),
      outOfStockDate,
      transitList: trList, // [{oci, qty, eta}]
    };
  });

  return rows;
}

export default function DemandPlanningTable() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

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
          const demandSheet = [
            { presentation_code: "PC0001", current_stock_units: 1200 },
            { presentation_code: "PC0004", current_stock_units: 350 },
          ];
          const tenderItems = [
            { presentation_code: "PC0001", awarded_qty: 6000, first_delivery_date: "2025-06-01", last_delivery_date: "2026-05-31" },
            { presentation_code: "PC0004", awarded_qty: 900, first_delivery_date: "2025-09-01", last_delivery_date: "2026-02-28" },
          ];
          const importHeaders = [ { oci_number: "OCI-123", import_status: "Transit", eta: "2025-10-15" } ];
          const importItems   = [ { oci_number: "OCI-123", presentation_code: "PC0001", qty: 800 } ];
          const catalog       = [
            { presentation_code: "PC0001", product_name: "Metronidazol", package_units: 100 },
            { presentation_code: "PC0004", product_name: "Apixabán (Spiroaart®)", package_units: 30 },
          ];

          const built = buildRows({ catalog, demandSheet, tenderItems, importHeaders, importItems });
          if (!cancelled) setRows(built);
          runDevTests();
          return;
        }

        // Carga real desde backend
        const [demandSheet, tenderItems, importHeaders, importItems, catalog] = await Promise.all([
          readTable("demand"),
          readTable("tender_items"),
          readTable("imports"),
          readTable("import_items"),
          readTable("product_presentation_master"),
        ]);

        const built = buildRows({ catalog, demandSheet, tenderItems, importHeaders, importItems });
        if (!cancelled) setRows(built);
      } catch (e) {
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
    { key: "monthlyDemandUnits", header: "Demand (monthly)" },
    { key: "monthSupply", header: "Month Supply" },
    { key: "status", header: "Status" },
    { key: "outOfStockDate", header: "Date Out of Stock" },
    { key: "transitList", header: "Transit" },
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
            Verifica <code>VITE_SHEETS_API_URL</code> en tu <code>.env.local</code> o que exista el proxy <code>/api/gas-proxy</code> en Vercel.
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
              <tr key={r.presentation_code} className="border-t align-top">
                <td className="px-3 py-2">
                  <div className="font-medium">{r.product_label}</div>
                  <div className="text-gray-500">{r.presentation_code}</div>
                </td>
                <td className="px-3 py-2">{Math.round(r.currentStockUnits)}</td>
                <td className="px-3 py-2">{r.monthlyDemandUnits.toFixed(2)}</td>
                <td className="px-3 py-2">{Number.isFinite(r.monthSupply) ? r.monthSupply.toFixed(2) : "∞"}</td>
                <td className="px-3 py-2">
                  <StatusPill status={r.status} />
                </td>
                <td className="px-3 py-2">{r.outOfStockDate ? formatDate(r.outOfStockDate) : "—"}</td>
                <td className="px-3 py-2">
                  {r.transitList && r.transitList.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1">
                      {r.transitList.map((t, i) => (
                        <li key={i}>
                          OCI <span className="font-medium">{t.oci}</span>: {t.qty || 0} u.
                          {t.eta ? ` · ETA ${formatDate(t.eta)}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "—"
                  )}
                </td>
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
        * Meses de demanda calculados como meses calendario inclusivos entre <code>first_delivery_date</code> y <code>last_delivery_date</code>. Si faltan fechas, se asume 1 mes.
      </p>
    </div>
  );
}

function StatusPill({ status }) {
  const base = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium";
  const colors = {
    Critical: "bg-red-100 text-red-700",
    Urgent: "bg-orange-100 text-orange-700",
    Normal: "bg-yellow-100 text-yellow-700",
    Optimal: "bg-green-100 text-green-700",
    "N/A": "bg-gray-100 text-gray-600",
  };
  return <span className={`${base} ${colors[status] || colors["N/A"]}`}>{status}</span>;
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

    // 2) monthsCalendarInclusive
    const d1 = new Date("2025-06-15");
    const d2 = new Date("2025-06-15");
    console.assert(monthsCalendarInclusive(d1, d2) === 1, "mismo día ⇒ 1 mes");
    const d3 = new Date("2025-01-01");
    const d4 = new Date("2025-03-31");
    console.assert(monthsCalendarInclusive(d3, d4) === 3, "Ene..Mar ⇒ 3 meses");

    // 3) buildRows mínimo
    const built = buildRows({
      catalog: [{ presentation_code: "PCX", product_name: "Dummy", package_units: 10 }],
      demandSheet: [{ presentation_code: "PCX", current_stock_units: 100 }],
      tenderItems: [{ presentation_code: "PCX", awarded_qty: 300, first_delivery_date: "2025-01-01", last_delivery_date: "2025-01-01" }],
      importHeaders: [
        { oci_number: "O1", import_status: "Transit", eta: "2025-12-31" },
        { oci_number: "O2", import_status: "Transit", eta: "2025-11-30" },
      ],
      importItems: [
        { oci_number: "O1", presentation_code: "PCX", qty: 50 },
        { oci_number: "O2", presentation_code: "PCX", qty: 25 },
      ],
    });
    console.assert(built.length === 1, "una fila");
    console.assert(built[0].monthlyDemandUnits > 0, "demanda > 0");
    console.assert(Array.isArray(built[0].transitList) && built[0].transitList.length === 2, "2 entradas tránsito");
    console.assert(built[0].transitList[0].eta && formatDate(built[0].transitList[0].eta) === "2025-11-30", "ETA más próxima primero");
  } catch (e) {
    console.warn("Tests (dev) fallaron:", e);
  }
}
