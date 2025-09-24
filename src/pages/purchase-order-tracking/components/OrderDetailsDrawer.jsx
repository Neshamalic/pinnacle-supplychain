// src/pages/purchase-order-tracking/components/OrderDetailsDrawer.jsx
import React, { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";

import { useSheet } from "@/lib/sheetsApi";
import {
  mapPurchaseOrderItems,
  mapImportItems,
  mapImports,
  mapCommunications,
} from "@/lib/adapters";
import { usePresentationCatalog } from "@/lib/catalog";

import CommunicationList from "@/components/CommunicationList";
import NewCommunicationModal from "@/pages/communications-log/components/NewCommunicationModal.jsx";

const fmtNum = (n) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Number(n || 0)
  );

const fmtMoney = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(n || 0));

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
};

const chip = (label, kind = "muted") => {
  const palette = {
    muted: "bg-muted text-foreground/70",
    blue: "bg-blue-100 text-blue-800",
    green: "bg-emerald-100 text-emerald-800",
    yellow: "bg-amber-100 text-amber-800",
    purple: "bg-purple-100 text-purple-800",
    gray: "bg-gray-100 text-gray-800",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${palette[kind]}`}>
      {label}
    </span>
  );
};

export default function OrderDetailsDrawer({ open, onClose, order, onEditItem }) {
  const [tab, setTab] = useState("items");
  const [openNewComm, setOpenNewComm] = useState(false);

  const poNumber = order?.poNumber || "";

  // Sheets
  const { rows: poItemsRows = [], loading: loadingPOI } = useSheet(
    "purchase_order_items",
    mapPurchaseOrderItems
  );
  const { rows: importItemsRows = [] } = useSheet("import_items", mapImportItems);
  const { rows: importsRows = [] } = useSheet("imports", mapImports);

  const { enrich } = usePresentationCatalog();

  // Build items + metrics
  const items = useMemo(() => {
    const base = (poItemsRows || []).filter((r) => r.poNumber === poNumber);
    const withNames = enrich(base);

    const importedBySku = {};
    (importItemsRows || []).forEach((it) => {
      if (it.poNumber !== poNumber) return;
      const key = it.presentationCode;
      importedBySku[key] = (importedBySku[key] || 0) + (it.qty || 0);
    });

    const firstImp = (importsRows || []).find((imp) => imp.poNumber === poNumber);

    return withNames.map((r) => {
      const imported = importedBySku[r.presentationCode] || 0;
      const remaining = Math.max((r.qty || 0) - imported, 0);

      return {
        ...r,
        imported,
        remaining,
        importStatus: firstImp?.importStatus || "",
        transportType: firstImp?.transportType || "",
      };
    });
  }, [poItemsRows, importItemsRows, importsRows, enrich, poNumber]);

  const totalUSD = useMemo(
    () => items.reduce((acc, it) => acc + (it.unitPrice || 0) * (it.qty || 0), 0),
    [items]
  );

  // Refresh comms after save
  const { refetch: refetchComms } = useSheet("communications", mapCommunications);
  const handleSavedComm = async () => {
    if (typeof refetchComms === "function") await refetchComms();
    setOpenNewComm(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2100] bg-black/40 flex justify-end">
      <div className="w-full max-w-5xl h-full bg-card border-l border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <div className="text-xl font-semibold text-foreground">
              Order Details – {poNumber || "PO"}
            </div>
            {order?.tenderRef ? (
              <div className="text-sm text-muted-foreground">
                Tender Ref: {order.tenderRef}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">
              Created: {fmtDate(order?.createdDate)}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <Icon name="X" size={18} />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border px-4">
          {[
            ["items", "Items", "Cube"],
            ["communications", "Communications", "MessageCircle"],
          ].map(([key, label, icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-3 text-sm font-medium flex items-center gap-2 ${
                tab === key
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon name={icon} size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto h-[calc(100%-110px)]">
          {tab === "items" && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="grid md:grid-cols-3 gap-3">
                <SummaryCard label="PO Number" value={poNumber || "—"} />
                <SummaryCard label="Created" value={fmtDate(order?.createdDate)} />
                <SummaryCard label="Total (USD)" value={fmtMoney(totalUSD)} />
              </div>

              {/* Items */}
              {(items || []).map((it, idx) => (
                <div key={`${it.presentationCode}-${idx}`} className="rounded-lg border p-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">
                        {it.productName || it.presentationCode}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Code: {it.presentationCode}
                        {it.packageUnits ? ` • ${it.packageUnits} units/pack` : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {typeof onEditItem === "function" && (
                        <Button size="sm" variant="secondary" onClick={() => onEditItem(it)}>
                          Edit
                        </Button>
                      )}
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          {fmtMoney(it.unitPrice)} / unit
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    {it.importStatus ? chip(it.importStatus, it.importStatus === "warehouse" ? "purple" : "yellow") : null}
                    {it.transportType ? chip(it.transportType, it.transportType === "air" ? "blue" : "green") : null}
                  </div>

                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <Metric label="Requested" value={fmtNum(it.qty)} />
                    <Metric label="Imported" value={fmtNum(it.imported)} />
                    <Metric label="Remaining" value={fmtNum(it.remaining)} />
                    <div className="md:text-right font-medium">
                      {fmtMoney((it.unitPrice || 0) * (it.qty || 0))}
                    </div>
                  </div>
                </div>
              ))}

              {loadingPOI && (
                <div className="text-sm text-muted-foreground">Loading items…</div>
              )}
              {!loadingPOI && (items || []).length === 0 && (
                <div className="text-sm text-muted-foreground">No items found.</div>
              )}
            </div>
          )}

          {tab === "communications" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Communication History</div>
                <Button size="sm" iconName="Plus" onClick={() => setOpenNewComm(true)}>
                  Add
                </Button>
              </div>
              {/* solo comunicaciones de ESTA PO */}
              <CommunicationList linkedType="orders" linkedId={poNumber} />
            </div>
          )}
        </div>
      </div>

      {/* Modal New Communication prellenado para Orders */}
      {openNewComm && (
        <NewCommunicationModal
          open={openNewComm}
          onClose={() => setOpenNewComm(false)}
          onSaved={handleSavedComm}
          defaultLinkedType="orders"
          defaultLinkedId={poNumber}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-lg border p-3 bg-muted/30">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-md border bg-white p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
