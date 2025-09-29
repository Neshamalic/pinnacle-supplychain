import React, { useEffect, useMemo, useState } from "react";

// === Config: URL de tu Apps Script o proxy ===
const BASE_URL = import.meta?.env?.VITE_SHEETS_API_URL || "/api/sheets";

// === Utilidades de fecha ===
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

// Suma “meses” aproximando fracción en días (para estimar la fecha de quiebre)
function addMonthsApprox(base, monthsFloat) {
  const DAYS_PER_MONTH = 30.437; // promedio
  const days = monthsFloat * DAYS_PER_MONTH;
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

// === Lectura genérica de tabla ===
async function readTable(name) {
  const url = `${BASE_URL}?route=table&name=${encodeURIComponent(name)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error leyendo ${name}: ${res.status}`);
  return await res.json();
}

// === Lógica de status según cobertura (meses) ===
// Reglas pedidas: <2 Critical, >2 y <4 Urgent, >4 y <6 Normal, >6 Optimal.
// Nota: los empates (=2, =4, =6) los tratamos más abajo (ver comentario).
function coverageStatus(months) {
  if (!isFinite(months) || months <= 0) return "Critical";
  if (months < 2) return "Critical";
  if (months > 2 && months < 4) return "Urgent";
  if (months > 4 && months < 6) return "Normal";
  if (months > 6) return "Optimal";
  // Empates exactos (ajustables según lo que prefieras):
  if (months === 2) return "Urgent";
  if (months === 4) return "Normal";
  if (months === 6) return "Optimal";
  return "Normal";
}

export default function DemandPlanningTable() {
  const [loading, setLoading] = useState(true);
  const [error, setError]       = useState(null);
  const [rows, setRows]         = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) Lee hojas necesarias
        const [demand, tenderItems, imports, importItems, catalog] = await Promise.all([
          readTable("demand"),                       // stock por presentation_code (current_stock_units)
          readTable("tender_items"),                 // awarded_qty + fechas
          readTable("imports"),                      // encabezados (oci_number, import_status, eta)
          readTable("import_items"),                 // detalle por oci_number + presentation_code + qty
          readTable("product_presentation_master"),  // product_name, package_units
        ]);

        // 2) Índices rápidos
        const catByCode = new Map();
        for (const c of catalog || []) {
          const code = String(c.presentation_code || "").trim();
          if (!code) continue;
          catByCode.set(code, {
            product_name: c.product_name || "",
            package_units: Number(c.package_units || 0),
          });
        }

        const stockByCode = new Map();
        for (const d of demand || []) {
          const code = String(d.presentation_code || d.presentationCode || "").trim();
          if (!code) continue;
          const stock = Number(d.current_stock_units || d.currentStockUnits || 0);
          stockByCode.set(code, (stockByCode.get(code) || 0) + stock);
        }

        // 3) Demanda mensual por presentation_code desde tender_items (meses calendario exactos)
        const monthlyDemandByCode = new Map();
        for (const ti of tenderItems || []) {
          const code = String(ti.presentation_code || ti.presentationCode || "").trim();
          if (!code) continue;
          const awarded = Number(ti.awarded_qty || 0);
          const first   = parseDateISO(ti.first_delivery_date);
          const last    = parseDateISO(ti.last_delivery_date);
          const months  = monthsCalendarInclusive(first, last); // calendario exacto
          const monthly = months > 0 ? awarded / months : 0;
          monthlyDemandByCode.set(code, (monthlyDemandByCode.get(code) || 0) + monthly);
        }

        // 4) Importaciones en tránsito: listado detallado por OCI para cada código
        const headerByOCI = new Map();
        for (const h of imports || []) {
          if (!h.oci_number) continue;
          headerByOCI.set(String(h.oci_number), h);
        }

        const transitByCode = new Map(); // code => [{oci, qty, eta}, ...]
        for (const ii of importItems || []) {
          const oci = String(ii.oci_number || "").trim();
          const head = headerByOCI.get(oci);
          if (!head) continue;
          const status = String(head.import_status || "").toLowerCase();
          if (status !== "transit") continue;

          const code = String(ii.presentation_code || "").trim();
          if (!code) continue;
          const qty = Number(ii.qty || 0);
          const eta = parseDateISO(head.eta);

          const list = transitByCode.get(code) || [];
          list.push({ oci, qty, eta });
          transitByCode.set(code, list);
        }

        // 5) Construir filas para todos los códigos que aparezcan en catálogo o demand
        const allCodes = new Set([
          ...Array.from(catByCode.keys()),
          ...Array.from(stockByCode.keys()),
          ...Array.from(monthlyDemandByCode.keys()),
        ]);

        const today = new Date();
        const built = Array.from(allCodes).map((code) => {
          const stock   = Number(stockByCode.get(code) || 0);
          const demandM = Number(monthlyDemandByCode.get(code) || 0);
          const months  = demandM > 0 ? stock / demandM : Infinity;

          const cat = catByCode.get(code) || {};
          const productLabel = `${cat.product_name || ""} • ${code}${cat.package_units ? ` (x${cat.package_units})` : ""}`.trim();

          const outOfStockDate =
            demandM > 0 && stock > 0 ? addMonthsApprox(today, stock / demandM) : undefined;

          const trList = transitByCode.get(code) || [];
          // Ordena por ETA ascendente; muestra cada OCI en su propia línea.
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

        if (!cancelled) setRows(built);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Error cargando Demand Planning");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
            Verifica <code>VITE_SHEETS_API_URL</code> en tu <code>.env.local</code> o tu proxy <code>/api/sheets</code>.
          </div>
        </div>
      )}

      <div className="overflow-x-auto border rounded-2xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Product</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Stock</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Demand (monthly)</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Month Supply</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Date Out of Stock</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Transit</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Actions</th>
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
        * Meses de demanda calculados como meses calendario inclusivos entre <code>first_delivery_date</code> y
        <code> last_delivery_date</code>. Si faltan fechas, se asume 1 mes.
      </p>
    </div>
  );
}

// === Helpers de UI ===
function StatusPill({ status }) {
  const base =
    "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium";
  const colors = {
    Critical: "bg-red-100 text-red-700",
    Urgent: "bg-orange-100 text-orange-700",
    Normal: "bg-yellow-100 text-yellow-700",
    Optimal: "bg-green-100 text-green-700",
    "N/A": "bg-gray-100 text-gray-600",
  };
  return <span className={`${base} ${colors[status] || colors["N/A"]}`}>{status}</span>;
}

function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
