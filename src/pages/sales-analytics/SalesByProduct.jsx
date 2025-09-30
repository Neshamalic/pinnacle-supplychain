import React, { useEffect, useMemo, useState } from "react";

/** Helpers */
function ymAdd(months = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function getQueryParam(name) {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  } catch {
    return null;
  }
}

export default function SalesByProduct() {
  // Lee ?presentation_code=&from=&to= si vienen en la URL
  const initialCode = getQueryParam("presentation_code") || "PC00063";
  const initialFrom = getQueryParam("from") || ymAdd(-11);
  const initialTo   = getQueryParam("to")   || ymAdd(0);

  const [presentationCode, setPresentationCode] = useState(initialCode);
  const [fromYM, setFromYM] = useState(initialFrom);
  const [toYM, setToYM]     = useState(initialTo);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [data, setData]       = useState(null);

  const totalUnits = useMemo(() => {
    if (!data?.series) return 0;
    return data.series.reduce((acc, [, u]) => acc + (Number(u) || 0), 0);
  }, [data]);

  async function fetchSales() {
    try {
      setLoading(true);
      setError(null);
      setData(null);

      const u = new URL("/api/mm-sales", window.location.origin);
      // Acepta presentation_code o code; devolvemos presentation_code en JSON
      u.searchParams.set("presentation_code", presentationCode.trim());
      u.searchParams.set("from", fromYM.trim());
      u.searchParams.set("to", toYM.trim());

      const r = await fetch(u.toString());
      const j = await r.json();
      if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
      setData(j);
    } catch (e) {
      setError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  async function exportToSheet() {
    if (!data) return;
    try {
      const url = `${(import.meta.env?.VITE_SHEETS_API_URL) || "/api/gas-proxy"}?route=write&action=upsert_sales_series&name=sales_by_month`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presentation_code: data.presentation_code,
          from: data.from,
          to: data.to,
          series: data.series, // [[YYYY-MM, units], ...]
        }),
      });
      const text = await res.text();
      let json = null; try { json = JSON.parse(text); } catch {}
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `HTTP ${res.status}`);
      alert("Exportado a la hoja 'sales_by_month'.");
    } catch (e) {
      alert(`No se pudo exportar: ${e?.message || e}`);
    }
  }

  // Buscar automáticamente si llegó ?presentation_code en la URL
  useEffect(() => {
    if (initialCode) fetchSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-3">Sales by Product (Monthly Units)</h2>

      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Presentation code</label>
          <input
            className="border rounded-xl px-2 py-1"
            value={presentationCode}
            onChange={e => setPresentationCode(e.target.value)}
            placeholder="PC00063"
            spellCheck="false"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600">From (YYYY-MM)</label>
          <input
            className="border rounded-xl px-2 py-1"
            value={fromYM}
            onChange={e => setFromYM(e.target.value)}
            placeholder="2025-01"
            spellCheck="false"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600">To (YYYY-MM)</label>
          <input
            className="border rounded-xl px-2 py-1"
            value={toYM}
            onChange={e => setToYM(e.target.value)}
            placeholder="2025-09"
            spellCheck="false"
          />
        </div>

        <button className="px-3 py-2 rounded-xl border hover:bg-gray-50" onClick={fetchSales}>
          Fetch
        </button>

        {data && (
          <button className="px-3 py-2 rounded-xl border hover:bg-gray-50" onClick={exportToSheet}>
            Export to Sheet
          </button>
        )}
      </div>

      {loading && <div>Cargando…</div>}
      {error && (
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          {error}
        </div>
      )}

      {data && (
        <div className="overflow-hidden rounded-2xl border">
          <div className="grid grid-cols-3 gap-3 p-3 text-sm">
            <div><span className="text-gray-600">Code:</span> <b>{data.presentation_code}</b></div>
            <div><span className="text-gray-600">From:</span> <b>{data.from}</b></div>
            <div><span className="text-gray-600">To:</span> <b>{data.to}</b></div>
          </div>

          <div className="border-t">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-600 font-medium">Month</th>
                  <th className="px-3 py-2 text-right text-gray-600 font-medium">Units</th>
                </tr>
              </thead>
              <tbody>
                {data.series.map(([ym, units]) => (
                  <tr key={ym} className="border-t">
                    <td className="px-3 py-2">{ym}</td>
                    <td className="px-3 py-2 text-right">{units}</td>
                  </tr>
                ))}
                <tr className="border-t bg-gray-50 font-medium">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right">{totalUnits}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && !data && (
        <div className="text-sm text-gray-600">
          Ingresa un <b>presentation_code</b> y rango <b>YYYY-MM</b>, luego presiona <i>Fetch</i>.
        </div>
      )}
    </div>
  );
}
