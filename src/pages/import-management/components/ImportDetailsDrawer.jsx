// src/pages/import-management/components/ImportDetailsDrawer.jsx
import React, { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import { useSheet } from "@/lib/sheetsApi";
import { mapImportItems, mapCommunications } from "@/lib/adapters";
import { usePresentationCatalog } from "@/lib/catalog";
import CommunicationList from "@/components/CommunicationList";
import NewCommunicationModal from "@/pages/communications-log/components/NewCommunicationModal.jsx";

const cx = (...c) => c.filter(Boolean).join(" ");
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
};

const tonePill = (t) => {
  const v = String(t || "").toLowerCase();
  if (v.includes("warehouse")) return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  if (v.includes("transit")) return "bg-amber-100 text-amber-800 ring-amber-200";
  if (v === "air") return "bg-sky-100 text-sky-700 ring-sky-200";
  if (v === "sea") return "bg-indigo-100 text-indigo-700 ring-indigo-200";
  if (v.includes("approved")) return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  if (v.includes("pending") || v.includes("progress")) return "bg-amber-100 text-amber-800 ring-amber-200";
  if (v.includes("rejected") || v.includes("fail")) return "bg-rose-100 text-rose-700 ring-rose-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
};

const Pill = ({ children }) => (
  <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1", tonePill(children))}>
    {children || "—"}
  </span>
);

function InfoCard({ label, value }) {
  return (
    <div className="rounded-lg border p-3 bg-background">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value ?? "—"}</div>
    </div>
  );
}
function Field({ label, value }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{value ?? "—"}</div>
    </div>
  );
}

export default function ImportDetailsDrawer({ isOpen, onClose, importRow }) {
  const imp = importRow || {};
  const [tab, setTab] = useState("items");
  const [openNewComm, setOpenNewComm] = useState(false);

  const shipmentId = String(imp?.shipmentId || "").trim();

  // Leemos items desde varios posibles nombres de hoja
  const { rows: itemsA = [], loading: la } = useSheet("import_items", mapImportItems);
  const { rows: itemsB = [], loading: lb } = useSheet("imports_items", mapImportItems);
  const { rows: itemsC = [], loading: lc } = useSheet("Import Items", mapImportItems);

  const allRawItems = useMemo(() => [...itemsA, ...itemsB, ...itemsC], [itemsA, itemsB, itemsC]);
  const loading = la || lb || lc;

  const { enrich } = usePresentationCatalog();
  const items = useMemo(() => {
    const filtered = allRawItems.filter((r) => String(r.shipmentId || "").trim() === shipmentId);
    return enrich(filtered);
  }, [allRawItems, shipmentId, enrich]);

  // refrescar Communications tras guardar
  const { refetch: refetchComms } = useSheet("communications", () => ({}));
  const handleSavedComm = async () => {
    if (typeof refetchComms === "function") await refetchComms();
    setOpenNewComm(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2100] bg-black/40 flex justify-end">
      <div className="w-full max-w-5xl h-full bg-card border-l border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <div className="text-xl font-semibold text-foreground">Import Details</div>
            <div className="text-sm text-muted-foreground">Shipment ID: {shipmentId || "—"}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <Icon name="X" size={18} />
          </Button>
        </div>

        {/* Info común */}
        <div className="grid gap-3 p-4 border-b border-border bg-muted/20 md:grid-cols-3">
          <InfoCard label="ETA" value={fmtDate(imp?.eta)} />
          <InfoCard label="Transport" value={<Pill>{imp?.transportType}</Pill>} />
          <InfoCard label="Import Status" value={<Pill>{imp?.importStatus}</Pill>} />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border px-4">
          {[
            ["items", "Items", "Package"],
            ["communications", "Communications", "MessageCircle"],
          ].map(([key, label, icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-3 text-sm font-medium flex items-center gap-2 ${
                tab === key ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon name={icon} size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto h-[calc(100%-210px)]">
          {tab === "items" && (
            <div className="space-y-3">
              {(items || []).map((it, idx) => {
                const oci  = it.ociNumber;
                const po   = it.poNumber;
                const qc   = it.qcStatus;
                const lot  = it.lotNumber;
                const qty  = it.qty;
                const unit = it.unitPrice;
                const cur  = it.currency || "USD";
                const exp  = it.expiryDate;

                return (
                  <div key={idx} className="rounded-lg border bg-muted p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-foreground">
                          {it.productName || it.presentationCode || "Product"}
                          {it.packageUnits ? (
                            <span className="text-muted-foreground"> • {it.packageUnits} units/pack</span>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Code: {it.presentationCode || "—"}
                          {lot ? <> • Lot: {lot}</> : null}
                          {exp ? <> • Exp: {fmtDate(exp)}</> : null}
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        Qty: <span className="font-medium">{qty || 0}</span>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
                      <Field label="OCI Number" value={oci} />
                      <Field label="PO Number" value={po} />
                      <Field label="QC Status" value={<Pill>{qc}</Pill>} />
                      <Field label="Unit Price" value={`${cur} ${Number(unit || 0).toFixed(2)}`} />
                      <Field label="Lot Number" value={lot} />
                      <Field label="Expiry" value={fmtDate(exp)} />
                    </div>
                  </div>
                );
              })}
              {loading && <div className="text-sm text-muted-foreground">Loading items…</div>}
              {!loading && (items || []).length === 0 && (
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
              <CommunicationList linkedType="import" linkedId={shipmentId} />
            </div>
          )}
        </div>
      </div>

      {/* Modal New Communication (pre-relleno) */}
      {openNewComm && (
        <NewCommunicationModal
          open={openNewComm}
          onClose={() => setOpenNewComm(false)}
          onSaved={handleSavedComm}
          defaultLinkedType="Imports"
          defaultLinkedId={shipmentId}
        />
      )}
    </div>
  );
}
