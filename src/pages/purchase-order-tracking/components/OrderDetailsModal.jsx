// HOTFIX: versión sin NewCommunicationModal para que el modal abra sí o sí
import { useEffect, useMemo, useState } from "react";
import {
  API_BASE,
  fetchJSON,
  postJSON,
  formatNumber,
  formatCurrency,
  formatDate,
  badgeClass,
} from "@/lib/utils";
import CommunicationList from "@/components/CommunicationList";

// Helpers
const str = (v) => (v == null ? "" : String(v).trim());
const numFromInput = (v) => {
  if (v == null || v === "") return 0;
  const s = String(v).trim();
  if (s.includes(".") && s.includes(",")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      return parseFloat(s.replace(/\./g, "").replace(",", "."));
    }
    return parseFloat(s.replace(/,/g, ""));
  }
  if (s.includes(",") && !s.includes(".")) return parseFloat(s.replace(",", "."));
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};
const pick = (obj, keys, d = "") => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v != null && v !== "") return v;
  }
  return d;
};

export default function OrderDetailsModal({ open, onClose, order }) {
  const [tab, setTab] = useState("items"); // "items" | "communications"
  const [loading, setLoading] = useState(false);

  // Datos
  const [poItems, setPoItems] = useState([]);
  const [imports, setImports] = useState([]);
  const [importItems, setImportItems] = useState([]);

  // Edición header (costos)
  const [editOpen, setEditOpen] = useState(false);
  const [costUsd, setCostUsd] = useState("");
  const [totalQty, setTotalQty] = useState("");

  // 🔑 Claves
  const poNumber = str(pick(order || {}, ["po_number", "po", "id", "poNumber"]));
  const ociNumber = str(pick(order || {}, ["oci_number", "oci", "shipmentId", "OCI"]));

  // Carga con filtros del backend
  useEffect(() => {
    if (!open || !poNumber) return;
    let alive = true;
    setLoading(true);

    (async () => {
      try {
        const [poi, imps, impItems] = await Promise.all([
          fetchJSON(`${API_BASE}?route=table&name=purchase_orders&po=${encodeURIComponent(poNumber)}`),
          fetchJSON(`${API_BASE}?route=table&name=imports&po=${encodeURIComponent(poNumber)}`),
          fetchJSON(`${API_BASE}?route=table&name=import_items&po=${encodeURIComponent(poNumber)}`),
        ]);
        if (!alive) return;
        setPoItems(poi?.rows || []);
        setImports(imps?.rows || []);
        setImportItems(impItems?.rows || []);
      } catch (e) {
        console.error("OrderDetailsModal load error:", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, poNumber]);

  // Etiqueta única “OCI-123 / PO-123”
  const headerLabel = useMemo(() => {
    const oci = ociNumber || str(pick(imports[0] || {}, ["oci_number", "oci"]));
    const po = poNumber;
    if (oci && po) return `${oci} / ${po}`;
    if (po) return `PO ${po}`;
    if (oci) return `OCI ${oci}`;
    return "Order Details";
  }, [ociNumber, poNumber, imports]);

  // Agregados por código
  const items = useMemo(() => {
    const byCode = new Map();
    for (const r of poItems) {
      const code = str(pick(r, ["presentation_code", "sku", "code"]));
      if (!code) continue;
      const ordered = Number(pick(r, ["ordered_qty", "qty", "quantity", "total_qty"], 0)) || 0;
      const unitPrice = Number(pick(r, ["unit_price_usd", "unit_price", "price"], 0)) || 0;
      const prev = byCode.get(code) || { presentationCode: code, ordered: 0, unitPrice, imported: 0 };
      byCode.set(code, { ...prev, ordered: prev.ordered + ordered, unitPrice: unitPrice || prev.unitPrice });
    }
    for (const r of importItems) {
      const code = str(pick(r, ["presentation_code", "sku", "code"]));
      if (!code) continue;
      const qty = Number(pick(r, ["qty", "quantity"], 0)) || 0;
      const prev = byCode.get(code) || { presentationCode: code, ordered: 0, unitPrice: 0, imported: 0 };
      byCode.set(code, { ...prev, imported: prev.imported + qty });
    }
    return Array.from(byCode.values()).map((r) => ({
      ...r,
      remaining: Math.max(0, Number(r.ordered) - Number(r.imported)),
    }));
  }, [poItems, importItems]);

  // Guardar header (cost_usd, total_qty) con sanitización
  async function handleSaveHeader() {
    try {
      const payload = {
        row: {
          po_number: poNumber,
          cost_usd: numFromInput(costUsd),
          total_qty: numFromInput(totalQty),
        },
      };
      const res = await postJSON(`${API_BASE}?route=write&action=update&name=purchase_orders`, payload);
      if (!res?.ok && !res?.updated && !res?.upserted) throw new Error(JSON.stringify(res));
      setEditOpen(false);
      // recargar
      const re = await fetchJSON(`${API_BASE}?route=table&name=purchase_orders&po=${encodeURIComponent(poNumber)}`);
      setPoItems(re?.rows || []);
    } catch (e) {
      alert("No se pudo guardar. Revisa el número y formato.\n" + String(e));
    }
  }

  const mainImport = useMemo(() => {
    if (!imports?.length) return {};
    const sorted = [...imports].sort((a, b) => {
      const da = new Date(pick(a, ["eta", "arrival_date"]) || 0).getTime();
      const db = new Date(pick(b, ["eta", "arrival_date"]) || 0).getTime();
      return db - da;
    });
    return sorted[0] || {};
  }, [imports]);

  if (!open || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4">
      <div className="mx-auto w-full max-w-6xl rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <div className="text-xs text-slate-500">Order</div>
            <div className="text-lg font-semibold">{headerLabel}</div>
            <div className="mt-1 text-xs text-slate-500">
              ETA: {formatDate(pick(mainImport, ["eta", "arrival_date"]) || "") || "—"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={badgeClass("transport", pick(mainImport, ["transport_type"], ""))}>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium">
                {str(pick(mainImport, ["transport_type"], "—")).toUpperCase() || "—"}
              </span>
            </span>
            <span className={badgeClass("import", pick(mainImport, ["import_status"], ""))}>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium">
                {str(pick(mainImport, ["import_status"], "—")) || "—"}
              </span>
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 px-6 pt-4">
          <button
            className={`pb-2 text-sm ${
              tab === "items" ? "border-b-2 border-blue-600 text-blue-700" : "text-slate-500"
            }`}
            onClick={() => setTab("items")}
          >
            Items
          </button>
          <button
            className={`pb-2 text-sm ${
              tab === "communications" ? "border-b-2 border-blue-600 text-blue-700" : "text-slate-500"
            }`}
            onClick={() => setTab("communications")}
          >
            Communications
          </button>
        </div>

        {/* Contenido */}
        <div className="px-6 pb-6">
          {loading ? (
            <div className="p-6 text-slate-500">Cargando…</div>
          ) : tab === "items" ? (
            <div className="grid grid-cols-1 gap-4">
              {/* Resumen rápido */}
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3">
                <div>
                  <div className="text-xs text-slate-500">Items</div>
                  <div className="text-xl font-semibold">{formatNumber(items.length)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Ordered (sum)</div>
                  <div className="text-xl font-semibold">
                    {formatNumber(items.reduce((s, r) => s + Number(r.ordered || 0), 0))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Remaining (sum)</div>
                  <div className="text-xl font-semibold">
                    {formatNumber(items.reduce((s, r) => s + Number(r.remaining || 0), 0))}
                  </div>
                </div>
              </div>

              {/* Tabla */}
              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="grid grid-cols-5 gap-2 border-b px-4 py-2 text-xs text-slate-500">
                  <div>Code</div>
                  <div className="text-right">Ordered</div>
                  <div className="text-right">Imported</div>
                  <div className="text-right">Remaining</div>
                  <div className="text-right">Unit Price</div>
                </div>
                {items.map((it) => (
                  <div key={it.presentationCode} className="grid grid-cols-5 gap-2 px-4 py-2 text-sm">
                    <div className="font-medium">{it.presentationCode}</div>
                    <div className="text-right">{formatNumber(it.ordered)}</div>
                    <div className="text-right">{formatNumber(it.imported)}</div>
                    <div className="text-right">{formatNumber(it.remaining)}</div>
                    <div className="text-right">{formatCurrency(it.unitPrice)}</div>
                  </div>
                ))}
              </div>

              {/* Botón editar header (costos) */}
              <div className="flex justify-end">
                <button
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                  onClick={() => {
                    const row0 = poItems[0] || {};
                    setCostUsd(str(pick(row0, ["cost_usd", "usd", "amount_usd"], "")));
                    setTotalQty(str(pick(row0, ["total_qty", "qty_total"], "")));
                    setEditOpen(true);
                  }}
                >
                  Edit header (costs)
                </button>
              </div>
            </div>
          ) : (
            // Communications
            <div className="space-y-3">
              <div className="text-sm text-slate-600">
                Linked to: <span className="font-medium">orders</span> /{" "}
                <span className="font-mono">{poNumber || "—"}</span>
              </div>

              {/* OJO: sin modal de +Add en este hotfix para evitar errores de import */}
              <CommunicationList linkedType="orders" linkedId={poNumber} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
          <button
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>

      {/* Modal editar header */}
      {editOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
            <div className="mb-3 text-lg font-semibold">Edit costs (header)</div>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="text-slate-600">Cost USD</span>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={costUsd}
                  onChange={(e) => setCostUsd(e.target.value)}
                  placeholder="Ej: 1,10 o 1.10"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">Total Qty</span>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={totalQty}
                  onChange={(e) => setTotalQty(e.target.value)}
                  placeholder="Ej: 1.000 o 1000"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-lg border px-3 py-2 text-sm" onClick={() => setEditOpen(false)}>
                Cancel
              </button>
              <button
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                onClick={handleSaveHeader}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
