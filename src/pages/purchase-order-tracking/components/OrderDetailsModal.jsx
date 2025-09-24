// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import { useEffect, useMemo, useState } from "react";
import { API_BASE, fetchJSON, formatDate, formatNumber } from "@/lib/utils";
import CommunicationList from "@/components/CommunicationList";
import NewCommunicationModal from "@/pages/communications-log/components/NewCommunicationModal.jsx";
import { usePresentationCatalog } from "@/lib/catalog";

// --------- pequeños helpers UI ----------
function Chip({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-100 text-blue-700",
    teal: "bg-teal-100 text-teal-700",
    indigo: "bg-indigo-100 text-indigo-700",
    purple: "bg-purple-100 text-purple-700",
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function SectionCard({ children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {children}
    </div>
  );
}

// =====================================================

export default function OrderDetailsModal({ open, onClose, order }) {
  const [tab, setTab] = useState("items"); // items | communications
  const [poItems, setPoItems] = useState([]);
  const [imports, setImports] = useState([]);
  const [importItems, setImportItems] = useState([]);
  const [newComm, setNewComm] = useState(false);

  const { enrich } = usePresentationCatalog(); // nombre y units/pack por presentation_code

  useEffect(() => {
    if (!open || !order?.po_number) return;

    let mounted = true;
    (async () => {
      try {
        const [poi, imps, impItems] = await Promise.all([
          fetchJSON(`${API_BASE}?route=table&name=purchase_order_items`),
          fetchJSON(`${API_BASE}?route=table&name=imports`),
          fetchJSON(`${API_BASE}?route=table&name=import_items`),
        ]);

        if (!mounted) return;

        setPoItems((poi?.rows || []).filter(r => String(r.po_number || "").trim() === String(order.po_number || "").trim()));
        setImports((imps?.rows || []).filter(r => String(r.po_number || "").trim() === String(order.po_number || "").trim()));
        setImportItems((impItems?.rows || []).filter(r => String(r.po_number || "").trim() === String(order.po_number || "").trim()));
      } catch (e) {
        console.error("OrderDetailsModal load error:", e);
      }
    })();

    return () => { mounted = false; };
  }, [open, order?.po_number]);

  // Agrupamos import_items -> suma qty por presentation_code
  const importedByCode = useMemo(() => {
    const map = new Map();
    for (const r of importItems || []) {
      const code = String(r.presentation_code || r.presentationCode || "").trim();
      if (!code) continue;
      const qty = Number(r.qty || r.quantity || 0);
      map.set(code, (map.get(code) || 0) + (Number.isFinite(qty) ? qty : 0));
    }
    return map;
  }, [importItems]);

  // Un status y transport “principal” por la PO (tomamos el último por fecha si hubiera varios)
  const mainImport = useMemo(() => {
    if (!imports?.length) return { import_status: "", transport_type: "", eta: "" };
    // intentamos ordenar por ETA si viene
    const sorted = [...imports].sort((a, b) => {
      const da = new Date(a.eta || a.arrival_date || 0).getTime();
      const db = new Date(b.eta || b.arrival_date || 0).getTime();
      return (db || 0) - (da || 0);
    });
    const last = sorted[0];
    return {
      import_status: String(last.import_status || "").toLowerCase(),
      transport_type: String(last.transport_type || last.transport || "").toLowerCase(),
      eta: last.eta || last.arrival_date || "",
    };
  }, [imports]);

  // Enriquecemos items con nombre y units/pack + imported & remaining + price
  const items = useMemo(() => {
    const enriched = (poItems || []).map(r => {
      const code = String(r.presentation_code || r.presentationCode || "").trim();
      const ordered = Number(r.ordered_qty ?? r.qty ?? r.quantity ?? 0);
      const unitPrice =
        Number(r.unit_price_usd ?? r.unit_price ?? r.price ?? 0);
      const imported = importedByCode.get(code) || 0;
      const remaining = Math.max(ordered - imported, 0);
      return {
        code,
        ordered,
        unitPrice,
        imported,
        remaining,
      };
    });

    // enrich() añade productName y packageUnits si están en el catálogo
    return enrich(
      enriched.map(it => ({
        presentationCode: it.code,
        ...it,
      }))
    ).map(x => ({
      ...x,
      productName: x.productName || x.presentationCode,
      packageUnits: x.packageUnits || 1,
    }));
  }, [poItems, importedByCode, enrich]);

  const totalUSD = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.ordered || 0) * (it.unitPrice || 0), 0);
  }, [items]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2100] bg-black/40">
      <div className="absolute inset-0 flex justify-center overflow-y-auto p-6">
        <div className="w-full max-w-6xl rounded-xl bg-white shadow-2xl ring-1 ring-slate-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-slate-900">Order Details – PO</h2>
              <Chip tone="indigo">{order?.po_number}</Chip>
            </div>
            <div className="text-sm text-slate-500">
              <span className="mr-1">Created:</span>
              <span className="font-medium">{formatDate(order?.created_date)}</span>
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
            {/* ITEMS TAB */}
            {tab === "items" && (
              <>
                {/* top stats */}
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <SectionCard>
                    <div className="text-xs text-slate-500">PO Number</div>
                    <div className="mt-1 text-base font-medium">{order?.po_number || "—"}</div>
                  </SectionCard>
                  <SectionCard>
                    <div className="text-xs text-slate-500">Created</div>
                    <div className="mt-1 text-base font-medium">{formatDate(order?.created_date) || "—"}</div>
                  </SectionCard>
                  <SectionCard>
                    <div className="text-xs text-slate-500">Total (USD)</div>
                    <div className="mt-1 text-base font-semibold">
                      ${formatNumber(Math.round((totalUSD + Number.EPSILON) * 100) / 100)}
                    </div>
                  </SectionCard>
                </div>

                {/* Items list */}
                {(items || []).length === 0 && (
                  <div className="rounded-lg border border-dashed p-6 text-center text-slate-500">
                    No items found.
                  </div>
                )}

                <div className="space-y-4">
                  {items.map((it) => (
                    <SectionCard key={it.code}>
                      {/* Header line with product name and unit price */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">
                            {it.productName}{" "}
                            <span className="text-slate-500">
                              • {it.packageUnits} units/pack
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Code: {it.code}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500">/ unit</div>
                          <div className="text-sm font-medium">${it.unitPrice?.toFixed?.(2) ?? it.unitPrice}</div>
                        </div>
                      </div>

                      {/* Badges for import status & transport (de la PO) */}
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <div className="text-xs text-slate-500">Import Status</div>
                        <Chip tone={mainImport.import_status === "warehouse" ? "green" : mainImport.import_status === "transit" ? "amber" : "slate"}>
                          {mainImport.import_status || "—"}
                        </Chip>
                        <div className="ml-4 text-xs text-slate-500">Transport</div>
                        <Chip tone={mainImport.transport_type === "air" ? "blue" : mainImport.transport_type === "sea" ? "teal" : "slate"}>
                          {mainImport.transport_type || "—"}
                        </Chip>
                      </div>

                      {/* Stats row */}
                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <StatBox label="Requested" value={formatNumber(it.ordered)} />
                        <StatBox label="Imported" value={formatNumber(it.imported)} />
                        <StatBox label="Remaining" value={formatNumber(it.remaining)} />
                      </div>
                    </SectionCard>
                  ))}
                </div>
              </>
            )}

            {/* COMMUNICATIONS TAB */}
            {tab === "communications" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Communications</div>
                  <button
                    onClick={() => setNewComm(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-white shadow hover:bg-indigo-700"
                  >
                    + Add
                  </button>
                </div>
                <CommunicationList linkedType="orders" linkedId={order?.po_number || ""} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal para crear comunicación */}
      {newComm && (
        <NewCommunicationModal
          open={newComm}
          onClose={() => setNewComm(false)}
          onSaved={() => setNewComm(false)}
          defaultLinkedType="orders"
          defaultLinkedId={order?.po_number || ""}
        />
      )}
    </div>
  );
}
