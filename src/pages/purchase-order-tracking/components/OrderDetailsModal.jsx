// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import { useEffect, useMemo, useState } from "react";
import { API_BASE, fetchJSON, formatCurrency, formatDate } from "@/lib/utils";
import NewCommunicationModal from "@/pages/communications-log/components/NewCommunicationModal.jsx";
import CommunicationList from "@/components/CommunicationList";

/* utils locales */
const n = (v) => {
  if (v == null || v === "") return 0;
  const s = String(v).replace(/\./g, "").replace(/,/g, ".");
  const x = parseFloat(s);
  return Number.isFinite(x) ? x : 0;
};
const by = (arr, k) => Object.fromEntries((arr || []).map(o => [String(o[k] || "").trim(), o]));
const fmtInt = (v) => new Intl.NumberFormat("en-US").format(n(v));

function Badge({ children, className = "" }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs ${className}`}>
      {children}
    </span>
  );
}

export default function OrderDetailsModal({ open, onClose, order }) {
  const po = String(order?.po_number || "").trim();
  const [tab, setTab] = useState("items");
  const [loading, setLoading] = useState(true);

  const [poItems, setPoItems] = useState([]);
  const [impItems, setImpItems] = useState([]);
  const [imports, setImports] = useState([]);
  const [master, setMaster] = useState([]);

  const [openNewComm, setOpenNewComm] = useState(false);

  useEffect(() => {
    if (!open || !po) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        // Filtradas en servidor (rápidas)
        const [poi, imi, imps] = await Promise.all([
          fetchJSON(`${API_BASE}?route=table&name=purchase_order_items&po=${encodeURIComponent(po)}`),
          fetchJSON(`${API_BASE}?route=table&name=import_items&po=${encodeURIComponent(po)}`),
          fetchJSON(`${API_BASE}?route=table&name=imports&po=${encodeURIComponent(po)}`),
        ]);
        // master (opcional)
        const pm = await fetchJSON(`${API_BASE}?route=table&name=product_presentation_master`).catch(() => ({rows: []}));

        if (cancel) return;
        setPoItems(poi?.rows || []);
        setImpItems(imi?.rows || []);
        setImports(imps?.rows || []);
        setMaster(pm?.rows || []);
      } catch (e) {
        console.error("OrderDetailsModal load", e);
        setPoItems([]); setImpItems([]); setImports([]); setMaster([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [open, po]);

  /* Mapa de imports por oci_number (para status/transport/eta) */
  const importsByOCI = useMemo(() => by(imports, "oci_number"), [imports]);

  /* Para cada code -> qty importada total + shipment más reciente (por eta) */
  const perCodeImport = useMemo(() => {
    const out = new Map();
    for (const r of impItems || []) {
      const code = String(r.presentation_code || "").trim();
      const qty  = n(r.qty || r.quantity);
      const oci  = String(r.oci_number || "").trim();
      const imp  = importsByOCI[oci] || {};
      const etaT = imp.eta ? new Date(imp.eta).getTime() : 0;

      if (!out.has(code)) {
        out.set(code, { imported: 0, last: null });
      }
      const rec = out.get(code);
      rec.imported += qty;

      // guardamos el shipment "más reciente" por eta
      if (!rec.last || (etaT > (rec.last.etaT || 0))) {
        rec.last = {
          etaT,
          import_status: (imp.import_status || "").toLowerCase(),
          transport_type: (imp.transport_type || "").toLowerCase(),
        };
      }
    }
    return out;
  }, [impItems, importsByOCI]);

  /* Enriquecimiento de PO items con master + import summary */
  const items = useMemo(() => {
    const pm = by(master, "presentation_code");
    return (poItems || []).map((r) => {
      const code = String(r.presentation_code || "").trim();
      const m = pm[code] || {};
      const ordered = n(r.ordered_qty ?? r.qty ?? r.quantity);
      const unitPrice = n(r.unit_price_usd ?? r.unit_price ?? r.price);

      const impRec = perCodeImport.get(code) || { imported: 0, last: null };
      const imported = n(impRec.imported);
      const remaining = Math.max(0, ordered - imported);

      return {
        code,
        productName: r.product_name || m.product_name || code,
        unitsPerPack: n(m.package_units || r.package_units || r.units_per_pack) || null,
        unitPrice,
        ordered,
        imported,
        remaining,
        importStatus: impRec.last?.import_status || "",
        transport: impRec.last?.transport_type || "",
      };
    });
  }, [poItems, master, perCodeImport]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2100] bg-black/40 flex justify-end">
      <div className="w-full max-w-5xl h-full bg-white shadow-2xl border-l border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              Order Details – PO
              <span className="ml-2 inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800">
                {po}
              </span>
            </h2>
          </div>
          <div className="text-sm text-slate-500">
            Created: {formatDate(order?.created_date)}
          </div>
          <button className="ml-4 rounded-md p-2 hover:bg-slate-100" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.9a1 1 0 1 0 1.41-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 px-5">
          {[
            ["items", "Items"],
            ["comms", "Communications"],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-4 py-3 text-sm font-medium ${
                tab === k ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto h-[calc(100%-104px)]">
          {/* ITEMS */}
          {tab === "items" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <Meta label="PO Number" value={po} />
                <Meta label="Created" value={formatDate(order?.created_date) || "—"} />
                <Meta
                  label="Total (USD)"
                  value={formatCurrency(items.reduce((acc, it) => acc + it.unitPrice * it.ordered, 0))}
                />
              </div>

              {loading && <div className="text-sm text-slate-500">Loading items…</div>}
              {!loading && items.length === 0 && <div className="text-sm text-slate-500">No items found.</div>}

              <div className="space-y-4">
                {items.map((it) => (
                  <div key={it.code} className="rounded-xl border border-slate-200 bg-slate-50">
                    <div className="flex items-start justify-between px-4 py-3 border-b border-slate-200">
                      <div>
                        <div className="font-medium text-slate-900">{it.productName}</div>
                        <div className="text-xs text-slate-500">
                          Code: {it.code}
                          {it.unitsPerPack ? <> &bull; {it.unitsPerPack} units/pack</> : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {it.importStatus && (
                          <Badge className="bg-emerald-50 text-emerald-700">{it.importStatus}</Badge>
                        )}
                        {it.transport && (
                          <Badge className="bg-blue-50 text-blue-700">{it.transport}</Badge>
                        )}
                        <div className="text-sm text-slate-600">
                          {formatCurrency(it.unitPrice)}{" "}
                          <span className="text-slate-400 text-xs">/ unit</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4">
                      <Kpi title="Requested" value={fmtInt(it.ordered)} />
                      <Kpi title="Imported" value={fmtInt(it.imported)} />
                      <Kpi title="Remaining" value={fmtInt(it.remaining)} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* COMMUNICATIONS */}
          {tab === "comms" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Communication History</div>
                <button
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700"
                  onClick={() => setOpenNewComm(true)}
                >
                  + Add
                </button>
              </div>
              <CommunicationList linkedType="orders" linkedId={po} />
            </div>
          )}
        </div>

        {openNewComm && (
          <NewCommunicationModal
            open={openNewComm}
            onClose={() => setOpenNewComm(false)}
            onSaved={() => setOpenNewComm(false)}
            defaultLinkedType="orders"
            defaultLinkedId={po}
          />
        )}
      </div>
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}
function Kpi({ title, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

