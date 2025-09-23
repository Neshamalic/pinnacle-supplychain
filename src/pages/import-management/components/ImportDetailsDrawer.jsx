// src/pages/import-management/components/ImportDetailsDrawer.jsx
import React, { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import { useSheet } from "@/lib/sheetsApi";
import { mapImportItems, mapCommunications } from "@/lib/adapters";
import { usePresentationCatalog } from "@/lib/catalog";
import CommunicationList from "@/components/CommunicationList";
import NewCommunicationModal from "@/pages/communications-log/components/NewCommunicationModal.jsx";

/* ---------- helpers ---------- */
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
};
const Pill = ({ children, tone = "muted" }) => {
  const color =
    tone === "green" ? "bg-emerald-100 text-emerald-700" :
    tone === "yellow" ? "bg-amber-100 text-amber-700" :
    tone === "blue" ? "bg-sky-100 text-sky-700" :
    "bg-slate-100 text-slate-700";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{children || "—"}</span>;
};

export default function ImportDetailsDrawer(props) {
  const isOpen = props.isOpen ?? props.open ?? false;
  const imp = props.importRow || props.importData || props.import || props.row || null;
  const onClose = props.onClose || (() => {});
  const [tab, setTab] = useState("items");
  const [openNewComm, setOpenNewComm] = useState(false);

  // Para refrescar lista de communications tras guardar
  const { refetch: refetchComms } = useSheet("communications", mapCommunications);

  if (!isOpen || !imp) return null;

  // Import items (por shipment_id)
  const { rows: allItems = [], loading } = useSheet("import_items", mapImportItems);

  const shipmentId = imp.shipmentId || imp.shipment_id || "";
  const eta = imp.eta || imp.arrivalDate;
  const transport = imp.transportType || imp.transport_type;
  const importStatus = imp.importStatus || imp.status;
  const qcStatus = imp.qcStatus || imp.qc_status;
  const customsStatus = imp.customsStatus || imp.customs_status;
  const location = imp.location || imp.destination;

  // Filtra ítems de esta importación
  const rawItems = useMemo(() => {
    return (allItems || []).filter((r) => {
      const sid = r.shipmentId || r.shipment_id;
      return String(sid) === String(shipmentId);
    });
  }, [allItems, shipmentId]);

  // Enriquecer con catálogo (nombre de producto y units/pack)
  const { enrich } = usePresentationCatalog();
  const items = useMemo(() => enrich(rawItems), [rawItems, enrich]);

  const handleSavedComm = async () => {
    if (typeof refetchComms === "function") await refetchComms();
    setOpenNewComm(false);
  };

  return (
    <div className="fixed inset-0 z-[2100] bg-black/40 flex justify-end">
      <div className="w-full max-w-5xl h-full bg-card border-l border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <div className="text-xl font-semibold text-foreground">Import Details</div>
            <div className="text-sm text-muted-foreground">
              Shipment ID: {shipmentId || "—"}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <Icon name="X" size={18} />
          </Button>
        </div>

        {/* Top info (común a todos los items) */}
        <div className="grid gap-3 p-4 border-b border-border bg-muted/20 md:grid-cols-3">
          <InfoCard label="ETA" value={fmtDate(eta)} />
          <InfoCard label="Transport" value={<Pill tone="blue">{transport}</Pill>} />
          <InfoCard label="Import Status" value={<Pill tone="blue">{importStatus}</Pill>} />
          <InfoCard label="QC Status" value={<Pill tone="green">{qcStatus}</Pill>} />
          <InfoCard label="Customs" value={<Pill tone="yellow">{customsStatus}</Pill>} />
          <InfoCard label="Location" value={location || "—"} />
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
                const oci = it.ociNumber || it.oci_number;
                const po = it.poNumber || it.po_number;
                const qc = it.qcStatus || it.qc_status;
                const lot = it.lotNumber || it.lot_number;
                const qty = it.qty || it.quantity;
                const unit = it.unitPriceUsd || it.unit_price_usd || it.unit_price;
                const expiry = it.expiryDate || it.expiry_date;
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
                          {expiry ? <> • Exp: {fmtDate(expiry)}</> : null}
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        Qty: <span className="font-medium">{qty || 0}</span>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
                      <Field label="OCI Number" value={oci} />
                      <Field label="PO Number" value={po} />
                      <Field label="QC Status" value={<Pill tone="green">{qc}</Pill>} />
                      <Field label="Unit Price (USD)" value={unit ?? "—"} />
                      <Field label="Lot Number" value={lot} />
                      <Field label="Expiry" value={fmtDate(expiry)} />
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

      {/* Modal New Communication (pre-relleno para este import) */}
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
