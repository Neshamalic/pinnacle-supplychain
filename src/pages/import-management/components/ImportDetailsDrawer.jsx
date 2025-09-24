// src/pages/import-management/components/ImportDetailsDrawer.jsx
import React, { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import { useSheet } from "@/lib/sheetsApi";
import { mapImportItems, mapCommunications } from "@/lib/adapters";
import { usePresentationCatalog } from "@/lib/catalog";
import CommunicationList from "@/components/CommunicationList";
import NewCommunicationModal from "@/pages/communications-log/components/NewCommunicationModal.jsx";

const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
};
const Pill = ({ children, tone = "slate" }) => {
  const tones = {
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-green-100 text-green-700",
    slate: "bg-slate-100 text-slate-700",
    gray: "bg-gray-100 text-gray-700",
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${tones[tone] || tones.slate}`}>{children}</span>;
};

export default function ImportDetailsDrawer({ open, onClose, importRow }) {
  const imp = importRow || {};
  const [tab, setTab] = useState("items");
  const [openNewComm, setOpenNewComm] = useState(false);

  // 1) Items desde la hoja import_items
  const { rows: allItems = [], loading } = useSheet("import_items", mapImportItems);
  // 2) Filtrar por OCI o PO del shipment seleccionado
  const itemsFiltered = useMemo(() => {
    const oci = (imp.ociNumber || "").trim();
    const po  = (imp.poNumber  || "").trim();
    return (allItems || []).filter(r =>
      (oci && r.ociNumber === oci) || (po && r.poNumber === po)
    );
  }, [allItems, imp.ociNumber, imp.poNumber]);

  // 3) Enriquecer con nombre de producto / unidades por pack
  const { enrich } = usePresentationCatalog();
  const items = useMemo(() => enrich(itemsFiltered), [itemsFiltered, enrich]);

  // Para refrescar communications tras guardar
  const { refetch: refetchComms } = useSheet("communications", mapCommunications);
  const handleSavedComm = async () => {
    if (typeof refetchComms === "function") await refetchComms();
    setOpenNewComm(false);
  };

  if (!open) return null;

  const oci = imp.ociNumber || "—";
  const po  = imp.poNumber  || "—";
  const eta = fmtDate(imp.eta);
  const transport = (imp.transportType || "").toLowerCase();
  const importStatus = (imp.importStatus || "").toLowerCase();

  return (
    <div className="fixed inset-0 z-[2100] bg-black/40 flex justify-end">
      <div className="w-full max-w-5xl h-full bg-card border-l border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <div className="text-xl font-semibold text-foreground">Import Details</div>
            <div className="text-sm text-muted-foreground">
              Shipment ID: {imp.shipmentId || "—"}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <Icon name="X" size={18} />
          </Button>
        </div>

        {/* Info cards top */}
        <div className="grid gap-3 p-4 border-b border-border bg-muted/20 md:grid-cols-3">
          <InfoCard label="OCI Number" value={oci} />
          <InfoCard label="PO Number" value={po} />
          <InfoCard label="ETA" value={eta} />
          <InfoCard label="Transport" value={<Pill tone={transport === "air" ? "blue" : transport === "sea" ? "slate" : "gray"}>{transport || "—"}</Pill>} />
          <InfoCard label="Import Status" value={<Pill tone={importStatus === "transit" ? "amber" : importStatus === "warehouse" ? "slate" : "gray"}>{importStatus || "—"}</Pill>} />
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
            <>
              {loading && <div className="text-sm text-muted-foreground">Loading items…</div>}
              {!loading && items.length === 0 && (
                <div className="text-sm text-muted-foreground">No items found for this shipment.</div>
              )}
              <div className="space-y-3">
                {items.map((it, idx) => (
                  <div key={idx} className="bg-muted rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-foreground">
                          {it.productName || it.presentationCode}
                        </div>
                        <div className="text-xs text-muted-foreground">{it.presentationCode}</div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        {it.currency} {it.unitPrice ?? 0}
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
                      <Field label="OCI">{it.ociNumber || "—"}</Field>
                      <Field label="PO">{it.poNumber || "—"}</Field>
                      <Field label="QC Status"><Pill tone="green">{it.qcStatus || "—"}</Pill></Field>
                      <Field label="Lot">{it.lotNumber || "—"}</Field>
                      <Field label="Qty">{it.qty ?? 0}</Field>
                      <Field label="Unit Price">{it.currency} {it.unitPrice ?? 0}</Field>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === "communications" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Communication History</div>
                <Button size="sm" iconName="Plus" onClick={() => setOpenNewComm(true)}>Add</Button>
              </div>
              <CommunicationList linkedType="import" linkedId={imp.shipmentId || ""} />
            </div>
          )}
        </div>
      </div>

      {/* Modal Nueva Comunicación (prefilled) */}
      {openNewComm && (
        <NewCommunicationModal
          open={openNewComm}
          onClose={() => setOpenNewComm(false)}
          onSaved={handleSavedComm}
          defaultLinkedType="import"
          defaultLinkedId={imp.shipmentId || ""}
        />
      )}
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-lg border p-3 bg-muted/30">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{children}</div>
    </div>
  );
}

