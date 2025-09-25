// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import { useEffect, useMemo, useState } from "react";
import { API_BASE, fetchJSON, formatCurrency, formatDate } from "@/lib/utils";
import NewCommunicationModal from "@/pages/communications-log/components/NewCommunicationModal.jsx";
import CommunicationList from "@/components/CommunicationList";

/* Helpers */
const num = (v) => {
  if (v == null || v === "") return 0;
  const s = String(v).replace(/\./g, "").replace(/,/g, ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

function Badge({ children, className = "" }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700 " +
        className
      }
    >
      {children}
    </span>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.9a1 1 0 1 0 1.41-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z"
      />
    </svg>
  );
}

/**
 * Modal con pestañas:
 *  - Items: carga purchase_order_items y enriquece con master para mostrar
 *           nombre del producto, units/pack, precio, requested/imported/remaining,
 *           import status y transport por línea.
 *  - Communications: lista y permite crear comunicaciones ligadas a la PO.
 */
export default function OrderDetailsModal({ open, onClose, order }) {
  const [tab, setTab] = useState("items");
  const [loading, setLoading] = useState(true);
  const [itemsRaw, setItemsRaw] = useState([]);
  const [master, setMaster] = useState([]);
  const [openNewComm, setOpenNewComm] = useState(false);

  /* Carga líneas de la PO + master */
  useEffect(() => {
    if (!open || !order?.po_number) return;
    let cancel = false;
    async function load() {
      setLoading(true);
      try {
        // líneas de la PO
        const resItems = await fetchJSON(
          `${API_BASE}?route=table&name=purchase_order_items`
        );
        // master de presentaciones (si no existe en tu hoja, no pasa nada)
        const resMaster = await fetchJSON(
          `${API_BASE}?route=table&name=product_presentation_master`
        ).catch(() => ({ ok: false, rows: [] }));

        if (cancel) return;

        const rowsItems = (resItems?.rows || []).filter(
          (r) => String(r.po_number || "").trim() === String(order.po_number)
        );
        setItemsRaw(rowsItems);
        setMaster(resMaster?.rows || []);
      } catch (err) {
        console.error("OrderDetailsModal load error:", err);
        setItemsRaw([]);
        setMaster([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    load();
    return () => {
      cancel = true;
    };
  }, [open, order?.po_number]);

  /* Enriquecimiento con master */
  const items = useMemo(() => {
    const byCode = new Map(
      (master || []).map((m) => [
        String(m.presentation_code || m.code || "").trim(),
        m,
      ])
    );
    return (itemsRaw || []).map((r) => {
      const code = String(r.presentation_code || r.code || "").trim();
      const m = byCode.get(code) || {};
      const requested =
        num(r.ordered_qty ?? r.ordered ?? r.qty ?? r.quantity ?? 0);
      const imported = num(r.imported_qty ?? r.imported ?? 0);
      const remaining = Math.max(0, requested - imported);
      const unitPrice = num(r.unit_price_usd ?? r.unit_price ?? r.price ?? 0);
      const pack = num(m.package_units ?? r.package_units ?? r.units_per_pack);
      const productName =
        r.product_name ||
        m.product_name ||
        `${code}` ||
        "Product";

      return {
        presentationCode: code,
        productName,
        packageUnits: pack || undefined,
        requested,
        imported,
        remaining,
        unitPrice,
        importStatus:
          String(r.import_status || r.importStatus || "").toLowerCase(),
        transport: String(r.transport || r.transport_type || "").toLowerCase(),
      };
    });
  }, [itemsRaw, master]);

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
                {order?.po_number || "—"}
              </span>
            </h2>
          </div>
          <div className="text-sm text-slate-500">
            Created: {formatDate(order?.created_date)}
          </div>
          <button
            className="ml-4 rounded-md p-2 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 px-5">
          {[
            ["items", "Items"],
            ["comms", "Communications"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-3 text-sm font-medium ${
                tab === key
                  ? "text-indigo-600 border-b-2 border-indigo-600"
                  : "text-slate-500 hover:text-slate-700"
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
              {/* resumen arriba */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <MetaCard label="PO Number" value={order?.po_number || "—"} />
                <MetaCard
                  label="Created"
                  value={formatDate(order?.created_date) || "—"}
                />
                <MetaCard
                  label="Total (USD)"
                  value={formatCurrency(
                    items.reduce(
                      (acc, it) => acc + (it.unitPrice || 0) * (it.requested || 0),
                      0
                    )
                  )}
                />
              </div>

              {loading && (
                <div className="text-sm text-slate-500">Loading items…</div>
              )}

              {!loading && items.length === 0 && (
                <div className="text-sm text-slate-500">No items found.</div>
              )}

              <div className="space-y-4">
                {items.map((it, idx) => (
                  <div
                    key={`${it.presentationCode}-${idx}`}
                    className="rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <div className="flex items-start justify-between px-4 py-3 border-b border-slate-200">
                      <div>
                        <div className="font-medium text-slate-900">
                          {it.productName}
                        </div>
                        <div className="text-xs text-slate-500">
                          Code: {it.presentationCode}
                          {it.packageUnits ? (
                            <>
                              {" "}&bull; {it.packageUnits} units/pack
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {it.importStatus ? (
                          <Badge className="bg-emerald-50 text-emerald-700">
                            {it.importStatus}
                          </Badge>
                        ) : null}
                        {it.transport ? (
                          <Badge className="bg-blue-50 text-blue-700">
                            {it.transport}
                          </Badge>
                        ) : null}
                        <div className="text-sm text-slate-600">
                          {formatCurrency(it.unitPrice)}{" "}
                          <span className="text-slate-400 text-xs">/ unit</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4">
                      <Kpi title="Requested" value={it.requested} />
                      <Kpi title="Imported" value={it.imported} />
                      <Kpi title="Remaining" value={it.remaining} />
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
              <CommunicationList
                linkedType="orders"
                linkedId={order?.po_number || ""}
              />
            </div>
          )}
        </div>

        {/* New communication */}
        {openNewComm && (
          <NewCommunicationModal
            open={openNewComm}
            onClose={() => setOpenNewComm(false)}
            onSaved={() => setOpenNewComm(false)}
            defaultLinkedType="orders"
            defaultLinkedId={order?.po_number || ""}
          />
        )}
      </div>
    </div>
  );
}

function MetaCard({ label, value }) {
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
      <div className="mt-1 text-2xl font-semibold text-slate-900">
        {Number.isFinite(+value) ? new Intl.NumberFormat("en-US").format(+value) : value}
      </div>
    </div>
  );
}
