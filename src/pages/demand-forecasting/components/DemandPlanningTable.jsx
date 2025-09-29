import React, { useEffect, useMemo, useState } from "react";

/**
 * DemandPlanningTable (JS)
 *
 * Reglas y orígenes:
 * - Stock desde "demand" (current_stock_units por presentation_code).
 * - Demand (mensual) desde "tender_items": awarded_qty / meses calendario inclusivos
 *   (si no hay tender_items, usa fallback demand.monthlydemandunits si viene en "demand").
 * - Status: <2 Critical | 2..4 Urgent | >4..6 Normal | >6 Optimal
 * - Transit: une "imports" (import_status, eta) + "import_items" (oci_number, presentation_code, qty),
 *   acepta "Transit", "In transit", "En tránsito", etc. (case/acentos-insensible) y
 *   si una OCI aparece varias veces en imports, se considera tránsito si **cualquiera** lo es.
 * - Product: muestra "CÓDIGO — NOMBRE (xPACK)".
 *
 * Backend: usa "/api/gas-proxy" (o VITE_SHEETS_API_URL).
 */

const BASE_URL = (import.meta?.env?.VITE_SHEETS_API_URL) || "/api/gas-proxy";

/* ========================= Utils generales ========================= */
function normKey(s) {
  return String(s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}
function pick(obj, candidates) {
  if (!obj || typeof obj !== "object") return undefined;
  const map = new Map(Object.keys(obj).map(k => [normKey(k), k]));
  for (const c of candidates) {
    const k = map.get(normKey(c));
    if (k !== undefined) return obj[k];
  }
  return undefined;
}
function stripAccents(s = "") {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function isTransitStatus(s = "") {
  const x = stripAccents(String(s)).toLowerCase();
  // admite "transit", "in transit", "en transito", etc.
  return x.includes("transit") || x.includes("transito");
}

/* ========================= Utils de fecha ========================= */
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
// Suma "meses" como fracción para estimar fecha de quiebre (≈30.437 días/mes)
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

/* ========================= IO (leer/escribir) ========================= */
async function readTable(name) {
  const url = `${BASE_URL}?route=table&name=${encodeURIComponent(name)}`;
  const res = await fetch(url);
  const text = await res.text();

  if (!res.ok) throw new Error(`Error leyendo ${name}: ${res.status}`);

  let data;
  try { data = JSON.parse(text); }
  catch { console.warn(`[readTable] ${name}: respuesta no JSON`, text.slice(0, 120)); return []; }

  // Tu backend: { ok:true, sheet:"...", rows:[...] }
  if (data && typeof data === "object" && Array.isArray(data.rows)) return data.rows;

  // Otros formatos comunes
  for (const k of ["values", "data", "records", "items"]) {
    if (data && typeof data === "object" && Array.isArray(data[k])) return data[k];
  }

  if (data && data.ok === false) throw new Error(String(data.error || `ok:false para ${name}`));

  console.warn(`[readTable] ${name}: formato desconocido`, Object.keys(data || {}));
  return [];
}

async function writeTable(name, action, payload) {
  const url = `${BASE_URL}?route=write&action=${encodeURIComponent(action)}&name=${encodeURIComponent(name)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: typeof payload === "string" ? payload : JSON.stringify(payload || {}),
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  if (!res.ok || (data && data.ok === false)) {
    const err = data?.error || `Error escribiendo en ${name}: ${res.status}`;
    throw new Error(err);
  }
  return data || { ok: true };
}

/* ========================= Normalización de códigos ========================= */
/** Intenta normalizar un código para que haga match con el catálogo.
 *  - Si existe exacto en el catálogo, lo usa.
 *  - Si no, prueba quitando ceros finales (ej: PC000630 -> PC00063) hasta hacer match.
 *  - Si no encuentra, retorna el original.
 */
function normalizeToCatalog(code, catByCode) {
  let c = String(code || "").trim();
  if (catByCode.has(c)) return c;
  let t = c;
  while (t.endsWith("0") && t.length > 2) {
    t = t.slice(0, -1);
    if (catByCode.has(t)) return t;
  }
  return c;
}

/* ========================= Reglas de negocio ========================= */
function coverageStatus(months) {
  // <2 ⇒ Critical, 2..4 ⇒ Urgent, >4..6 ⇒ Normal, >6 ⇒ Optimal
  if (!isFinite(months) || months <= 0) return "Critical";
  if (months < 2) return "Critical";
  if (months <= 4) return "Urgent";
  if (months <= 6) return "Normal";
  return "Optimal";
}

function buildRows({ catalog, demandSheet, tenderItems, importHeaders, importItems }) {
  // 1) Catálogo por código (tal cual vienen los códigos en la hoja)
  const catByCode = new Map();
  for (const c of (Array.isArray(catalog) ? catalog : [])) {
    const code = String(pick(c, ["presentation_code","presentationCode","code"]) || "").trim();
    if (!code) continue;
    catByCode.set(code, {
      product_name: pick(c, ["product_name","productName","name"]) || "",
      package_units: Number(pick(c, ["package_units","packageUnits","units_per_pack","units"]) ?? 0),
    });
  }

  // 2) Stock y fallback de demanda mensual desde 'demand' (normalizando código contra catálogo)
  const stockByCode = new Map();                    // código-normalizado => stock
  const displayCodeByCode = new Map();              // código-normalizado => código a mostrar (raw de demand)
  const demandMonthlyFallbackByCode = new Map();    // código-normalizado => monthly demand fallback
  for (const d of (Array.isArray(demandSheet) ? demandSheet : [])) {
    const raw = String(pick(d, ["presentation_code","presentationCode","code"]) || "").trim();
    if (!raw) continue;
    const code = normalizeToCatalog(raw, catByCode);
    const stock = Number(pick(d, ["current_stock_units","currentStockUnits","stock_units","stock"]) || 0);
    stockByCode.set(code, (stockByCode.get(code) || 0) + stock);
    if (!displayCodeByCode.has(code)) displayCodeByCode.set(code, raw);

    const dm = Number(pick(d, ["monthlydemandunits","monthly_demand_units","monthlyDemandUnits"]) || 0);
    if (dm > 0) demandMonthlyFallbackByCode.set(code, dm);
  }

  // 3) Demanda mensual desde tender_items (normalizando código contra catálogo)
  const monthlyDemandByCode = new Map(); // código-normalizado => monthly demand calculada
  for (const ti of (Array.isArray(tenderItems) ? tenderItems : [])) {
    const raw = String(pick(ti, ["presentation_code","presentationCode","code"]) || "").trim();
    if (!raw) continue;
    const code = normalizeToCatalog(raw, catByCode);
    const awarded = Number(pick(ti, ["awarded_qty","awardedQty","quantity","qty"]) || 0);
    const first = parseDateISO(pick(ti, ["first_delivery_date","firstDeliveryDate","start_date","startDate"]));
    const last  = parseDateISO(pick(ti, ["last_delivery_date","lastDeliveryDate","end_date","endDate"]));
    const months = monthsCalendarInclusive(first, last);
    const monthly = months > 0 ? awarded / months : 0;
    monthlyDemandByCode.set(code, (monthlyDemandByCode.get(code) || 0) + monthly);
  }

  // 4) Imports: agrupar por OCI; si alguna fila es "transit", se marca transit; ETA = mínima fecha vista
  const headerByOCI = new Map(); // OCI => { isTransit, eta }
  for (const h of (Array.isArray(importHeaders) ? importHeaders : [])) {
    const oci = String(pick(h, ["oci_number","ociNumber","oci"]) || "").trim();
    if (!oci) continue;
    const statusRaw = pick(h, ["import_status","importStatus","status"]) || "";
    const etaRaw = pick(h, ["eta","arrival_date","arrivalDate","eta_date","ETD"]);
    const eta = parseDateISO(etaRaw);

    const prev = headerByOCI.get(oci) || { isTransit: false, eta: undefined };
    const nextIsTransit = prev.isTransit || isTransitStatus(statusRaw);
    let nextEta = prev.eta;
    if (eta && (!nextEta || eta.getTime() < nextEta.getTime())) nextEta = eta;

    headerByOCI.set(oci, { isTransit: nextIsTransit, eta: nextEta });
  }

  // 5) Import items: sumar por código-normalizado (solo si su OCI está en tránsito)
  const transitByCode = new Map(); // código-normalizado => [{ oci, qty, eta }, ...]
  for (const ii of (Array.isArray(importItems) ? importItems : [])) {
    const oci = String(pick(ii, ["oci_number","ociNumber","oci"]) || "").trim();
    const head = headerByOCI.get(oci);
    if (!head || !head.isTransit) continue;

    const raw = String(pick(ii, [
      "presentation_code","presentationCode","product_code","productCode","sku","item_code","presentation"
    ]) || "").trim();
    if (!raw) continue;
    const code = normalizeToCatalog(raw, catByCode);

    const qty = Number(pick(ii, ["qty","quantity","units","units_qty","qty_units"]) || 0);
    const eta = head.eta;
    const list = transitByCode.get(code) || [];
    list.push({ oci, qty, eta });
    transitByCode.set(code, list);
  }

  // 6) Construcción de filas
  const allCodes = new Set([
    ...Array.from(stockByCode.keys()),
    ...Array.from(monthlyDemandByCode.keys()),
  ]);

  const today = new Date();
  const rows = Array.from(allCodes).map((code) => {
    const stock = Number(stockByCode.get(code) || 0);

    let demandM = Number(monthlyDemandByCode.get(code) || 0);
    if (!demandM) demandM = Number(demandMonthlyFallbackByCode.get(code) || 0);

    const months = demandM > 0 ? stock / demandM : Infinity;

    const cat = catByCode.get(code) || {};
    const productName = cat.product_name || "";
    const packageUnits = cat.package_units || 0;

    const outOfStockDate = (demandM > 0 && stock > 0)
      ? addMonthsApprox(today, stock / demandM)
      : undefined;

    const trList = (transitByCode.get(code) || [])
      .slice()
      .sort((a, b) => {
        const ta = a.eta ? a.eta.getTime() : Infinity;
        const tb = b.eta ? b.eta.getTime() : Infinity;
        return ta - tb;
      });

    return {
      presentation_code: code,                                // código normalizado para joins
      product_code: displayCodeByCode.get(code) || code,      // código a mostrar (el que venía en demand)
      product_name: productName,
      package_units: packageUnits,
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

/* ========================= Componente ========================= */
export default function DemandPlanningTable() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [viewRow, setViewRow] = useState(null);

  const demo = typeof window !== "undefined" &&
               new URLSearchParams(window.location.search).get("demo") === "1";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        if (demo) {
          const demandSheet = [
            { presentation_code: "PC000630", current_stock_units: 533, monthlydemandunits: 400 },
            { presentation_code: "PC000640", current_stock_units: 8445, monthlydemandunits: 1100 },
          ];
          const tenderItems = [];

          const importHeaders = [
            { oci_number: "OCI-171", import_status: "transit", eta: "2025-08-08T04:00:00.000Z" },
            { oci_number: "OCI-171", import_status: "wharehouse", eta: "2025-08-08T04:00:00.000Z" },
          ];
          const importItems = [
            { oci_number: "OCI-171", presentation_code: "PC00064", qty: 4144 },
            { oci_number: "OCI-171", presentation_code: "PC00064", qty: 4309 },
            { oci_number: "OCI-171", presentation_code: "PC00063", qty: 539  },
          ];

          const catalog = [
            { presentation_code: "PC00063", product_name: "RIXAPIN 10 MG (RIVAROXABAN)", package_units: 60 },
            { presentation_code: "PC00064", product_name: "RIXAPIN 10 MG (RIVAROXABAN)", package_units: 112 },
          ];

          const built = buildRows({ catalog, demandSheet, tenderItems, importHeaders, importItems });
          if (!cancelled) setRows(built);
          return;
        }

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
    { key: "product", header: "Product" },
    { key: "currentStockUnits", header: "Stock" },
    { key: "monthlyDemandUnits", header: "Demand (monthly)" },
    { key: "monthSupply", header: "Month Supply" },
    { key: "status", header: "Status" },
    { key: "outOfStockDate", header: "Date Out of Stock" },
    { key: "transitList", header: "Transit" },
    { key: "actions", header: "Actions" },
  ], []);

  async function onUpdateStock(code) {
    const current = rows.find(r => r.presentation_code === code)?.currentStockUnits ?? 0;
    const input = window.prompt(`Nuevo stock para ${code}:`, String(current));
    if (input == null) return;
    const value = Number(input);
    if (!Number.isFinite(value) || value < 0) { alert("Ingresa un número válido (>= 0)"); return; }

    try {
      await writeTable("demand", "update", { presentation_code: code, current_stock_units: value });
      setRows(prev => prev.map(r => {
        if (r.presentation_code !== code) return r;
        const monthSupply = r.monthlyDemandUnits > 0 ? value / r.monthlyDemandUnits : Infinity;
        return {
          ...r,
          currentStockUnits: value,
          monthSupply,
          status: coverageStatus(monthSupply),
          outOfStockDate: (r.monthlyDemandUnits > 0 && value > 0) ? addMonthsApprox(new Date(), monthSupply) : undefined,
        };
      }));
      alert("Stock actualizado");
    } catch (e) {
      alert(`No se pudo actualizar: ${e?.message || e}`);
    }
  }

  function onView(row) { setViewRow(row); }

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
                  <div className="font-semibold">
                    {r.product_code}
                    {(r.product_name || r.package_units) && " — "}
                    {r.product_name || ""}
                    {r.package_units ? ` (x${r.package_units})` : ""}
                  </div>
                </td>
                <td className="px-3 py-2">{Math.round(r.currentStockUnits)}</td>
                <td className="px-3 py-2">{r.monthlyDemandUnits ? r.monthlyDemandUnits.toFixed(2) : "0.00"}</td>
                <td className="px-3 py-2">{Number.isFinite(r.monthSupply) ? r.monthSupply.toFixed(2) : "∞"}</td>
                <td className="px-3 py-2"><StatusPill status={r.status} /></td>
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
                  ) : "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button className="px-2 py-1 rounded-xl border hover:bg-gray-50" onClick={() => onView(r)}>View</button>
                    <button className="px-2 py-1 rounded-xl border hover:bg-gray-50" onClick={() => onUpdateStock(r.presentation_code)}>Update stock</button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-sm text-gray-500" colSpan={columns.length}>
                  No hay productos para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        * Meses de demanda calculados como meses calendario inclusivos entre <code>first_delivery_date</code> y <code>last_delivery_date</code>. Si faltan fechas, se asume 1 mes.
      </p>

      {/* Modal View */}
      {viewRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl p-4 w-full max-w-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Producto {viewRow.product_code}</h3>
              <button className="text-gray-500 hover:text-gray-800" onClick={() => setViewRow(null)}>✕</button>
            </div>
            <div className="space-y-2 text-sm">
              <div><span className="text-gray-500">Nombre:</span> {viewRow.product_name || "—"}</div>
              <div><span className="text-gray-500">Pack:</span> {viewRow.package_units ? `x ${viewRow.package_units}` : "—"}</div>
              <div><span className="text-gray-500">Stock:</span> {viewRow.currentStockUnits}</div>
              <div><span className="text-gray-500">Demand (monthly):</span> {viewRow.monthlyDemandUnits?.toFixed(2) || "0.00"}</div>
              <div><span className="text-gray-500">Month Supply:</span> {Number.isFinite(viewRow.monthSupply) ? viewRow.monthSupply.toFixed(2) : "∞"}</div>
              <div><span className="text-gray-500">Status:</span> {viewRow.status}</div>
              <div><span className="text-gray-500">Date OOS:</span> {viewRow.outOfStockDate ? formatDate(viewRow.outOfStockDate) : "—"}</div>
              <div>
                <span className="text-gray-500">Transit:</span>
                {viewRow.transitList && viewRow.transitList.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 mt-1">
                    {viewRow.transitList.map((t, i) => (
                      <li key={i}>OCI <b>{t.oci}</b>: {t.qty || 0} u.{t.eta ? ` · ETA ${formatDate(t.eta)}` : ""}</li>
                    ))}
                  </ul>
                ) : <div className="mt-1">—</div>}
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-1.5 rounded-xl border hover:bg-gray-50" onClick={() => setViewRow(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========================= UI helpers ========================= */
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
