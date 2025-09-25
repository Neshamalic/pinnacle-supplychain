// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import { useEffect, useMemo, useState } from "react";
import { API_BASE, fetchJSON, formatDate, formatNumber } from "@/lib/utils";
import CommunicationList from "@/components/CommunicationList";
import NewCommunicationModal from "@/pages/communications-log/components/NewCommunicationModal.jsx";
import { usePresentationCatalog } from "@/lib/catalog";

/* ---------- helpers tolerantes a alias/formatos ---------- */
const str = (v) => (v == null ? "" : String(v).trim());
const num = (v) => {
  if (v == null || v === "") return 0;
  const n = Number(String(v).replace(/\./g, "").replace(/,/g, "."));
  return Number.isFinite(n) ? n : 0;
};
const pick = (obj, arr) => {
  for (const k of arr) if (obj && Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
  return undefined;
};

/* ---------- UI helpers ---------- */
function Chip({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-100 text-blue-700",
    teal: "bg-teal-100 text-teal-700",
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
    indigo: "bg-indigo-100 text-indigo-700",
    purple: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}
function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}
function Card({ children }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">{children}</div>;
}

/* ========================================================= */

export default function OrderDetailsModal({ open, onClose, order }) {
  const [tab, setTab] = useState("items");
  const [poItems, setPoItems] = useState([]);
  const [imports, setImports] = useState([]);
  const [importItems, setImportItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newComm, setNewComm] = useState(false);

  // Enriquecimiento (nombre + unidades por pack) si existe catálogo
  let enrich = (arr) => arr;
  try {
    // el hook existe en tu repo; si falla, seguimos sin enrich
    enrich = usePresentationCatalog()?.enrich ?? enrich;
  } catch {}

  const poNumber = str(pick(order || {}, ["po_number", "po", "id"]) || "");

  useEffect(() => {
    if (!open || !poNumber) return;
    let alive = true;
    setLoading(true);

    (async () => {
      try {
        const [poi, imps, impItems] = await Promise.all([
          fetchJSON(`${API_BASE}?route=table&name=purchase_order_items`),
          fetchJSON(`${API_BASE}?route=table&name=imports`),
          fetchJSON(`${API_BASE}?route=table&name=import_items`),
        ]);

        if (!alive) return;

        // Filtramos por PO Number (aceptando alias)
        const poiRows = (poi?.rows || []).filter(
          (r) => str(pick(r, ["po_number", "po"])) === poNumber
        );
        const impRows = (imps?.rows || []).filter(
          (r) => str(pick(r, ["po_number", "po"])) === poNumber
        );
        const impItemsRows = (impItems?.rows || []).filter(
          (r) => str(pick(r, ["po_number", "po"])) === poNumber
        );

        setPoItems(poiRows);
        setImports(impRows);
        setImportItems(impItemsRows);
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

  // Suma importada por presentation_code
  const importedByCode = useMemo(() => {
    const map = new Map();
    for (const r of importItems || []) {
      const code = str(pick(r, ["presentation_code", "sku", "code"]) || "");
      if (!code) continue;
      map.set(code, (map.get(code) || 0) + num(pick(r, ["qty", "quantity"])));
    }
    return map;
  }, [importItems]);

  // Import status / transport para la PO (toma el más reciente por ETA si existe)
  const mainImport = useMemo(() => {
    if (!imports?.length) return { import_status: "", transport_type: "", eta: "" };
    const sorted = [...imports].sort((a, b) => {
      const da = new Date(pick(a, ["eta", "arrival_date"]) || 0).getTime();
      const db = new Date(pick(b, ["eta", "arrival_date"]) || 0).getTime();
      return (db || 0) - (da || 0);
    });
    const last = sorted[0] || {};
    return {
      import_status: str(pick(last, ["import_status", "status", "customs_status"])),
      transport_type: str(pick(last, ["transport_type", "transport", "mode"])),
      eta: pick(last, ["eta", "arrival_date"]) || "",
    };
  }, [imports]);

  // Ítems enriquecidos para UI (como “antes”)
  const items = useMemo(() => {
    const base = (poItems || []).map((r) => {
      const code = str(pick(r, ["presentation_code", "sku", "code"]) || "");
      const ordered = num(pick(r, ["ordered_qty", "qty", "quantity", "requested"]));
      const unitPrice = num(pick(r, ["unit_price_usd", "unit_price", "price"]));
      const imported = importedByCode.get(code) || 0;
      const remaining = Math.max(ordered - imported, 0);

      return { presentationCode: code, ordered, unitPrice, imported, remaining };
    });

    const enriched = enrich(base).map((x) => ({
      ...x,
      code: x.presentationCode,
      productName: x.productName || x.presentationCode,
      packageUnits: x.packageUnits || 1,
    }));

    return enriched;
  }, [poItems, importedByCode, enrich]);

  const totalUSD = useMemo(
    () => items.reduce((acc, it) => acc + (it.ordered || 0) * (it.unitPrice || 0), 0),
    [items]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2100] bg-black/40">
      <div className="absolute inset-0 flex justify-center overflow-y-auto p-6">
        <div className="w-full max-w-6xl rounded-xl bg-white shadow-2xl ring-1 ring-slate-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-slate-900">Order Details – PO</h2>
              <Chip tone="indigo">{poNumber || "—"}</Chip>
            </div>
            <div className="text-sm text-slate-500">
              <span className="mr-1">Created:</span>
              <span className="font-medium">{formatDate(pick(order || {}, ["created_date"])) || "—"}</span>
              <button className="ml-4 rounded-full p-1 hover:bg-slate-100" onClick={onClose} aria-label="Close">
                ×
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 px-4">
            {[
              ["items", "Items"],
              ["communications", "Communications"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-3 text-sm font-medium ${
                  tab === key ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-4">
            {tab === "items" && (
              <>
                {/* Top stats */}
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Card>
                    <div className="text-xs text-slate-500">PO Number</div>
                    <div className="mt-1 text-base font-medium">{poNumber || "—"}</div>
                  </Card>
                  <Card>
                    <div className="text-xs text-slate-500">Created</div>
                    <div className="mt-1 text-base font-medium">
                      {formatDate(pick(order || {}, ["created_date"])) || "—"}
                    </div>
                  </Card>
                  <Card>
                    <div className="text-xs text-slate-500">Total (USD)</div>
                    <div className="mt-1 text-base font-semibold">
                      ${formatNumber(Math.round((totalUSD + Number.EPSILON) * 100) / 100)}
                    </div>
                  </Card>
                </div>

                {loading && (
                  <div className="rounded-lg border border-dashed p-6 text-center text-slate-500">
                    Loading items…
                  </div>
                )}

                {!loading && (items || []).length === 0 && (
                  <div className="rounded-lg border border-dashed p-6 text-center text-slate-500">
                    No items found.
                  </div>
                )}

                {/* === Cards por ítem (como antes) === */}
                <div className="space-y-4">
                  {items.map((it) => {
                    const statusTone =
                      /ware/i.test(mainImport.import_status)
                        ? "green"
                        : /transit|custom/i.test(mainImport.import_status)
                        ? "amber"
                        : "slate";
                    const transportTone =
                      /air/i.test(mainImport.transport_type) ? "blue" : /sea/i.test(mainImport.transport_type) ? "teal" : "slate";

                    return (
                      <Card key={it.code}>
                        {/* Header: nombre + unit price */}
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-slate-900">
                              {it.productName}{" "}
                              <span className="text-slate-500">• {it.packageUnits} units/pack</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">Code: {it.code}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-slate-500">/ unit</div>
                            <div className="text-sm font-medium">
                              {it.unitPrice ? `\$${it.unitPrice.toFixed ? it.unitPrice.toFixed(2) : it.unitPrice}` : "—"}
                            </div>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <div className="text-xs text-slate-500">Import Status</div>
                          <Chip tone={statusTone}>{mainImport.import_status || "—"}</Chip>
                          <div className="ml-4 text-xs text-slate-500">Transport</div>
                          <Chip tone={transportTone}>{mainImport.transport_type || "—"}</Chip>
                          {mainImport.eta && (
                            <>
                              <div className="ml-4 text-xs text-slate
