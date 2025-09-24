// src/pages/import-management/components/ImportDetailsDrawer.jsx
import React, { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import { useSheet } from "@/lib/sheetsApi";
import { mapImportItems, mapImports, mapCommunications } from "@/lib/adapters";
import { usePresentationCatalog } from "@/lib/catalog";
import CommunicationList from "@/components/CommunicationList";
import NewCommunicationModal from "@/pages/communications-log/components/NewCommunicationModal.jsx";

const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "—"
    : new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
};
const Pill = ({ children, tone = "slate" }) => {
  const tones = {
    blue: "bg-blue-100 text-blue-700",
    indigo: "bg-indigo-100 text-indigo-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    slate: "bg-slate-100 text-slate-700",
    gray: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${tones[tone] || tones.slate}`}>
      {children || "—"}
    </span>
  );
};
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

export default function ImportDetailsDrawer({ open, onClose, importRow }) {
  if (!open) return null;

  const shipmentId = String(importRow?.shipmentId || "").trim();
  const [tab, setTab] = useState("items");
  const [openNewComm, setOpenNewComm] = useState(false);

  // 1) Usar ocis/pos que vienen DESDE la tabla; si no vinieran, buscar en la hoja imports
  const { rows: importsRows = [] } = useSheet("imports", mapImports);
  const ocis = useMemo(() => {
    if (Array.isArray(importRow?.ocis) && importRow.ocis.length) return importRow.ocis;
    const rows = importsRows.filter((r) => (r.shipmentId || "").trim() === shipmentId);
    return Array.from(new Set(rows.map((r) => (r.ociNumber || "").trim()).filter(Boolean)));
  }, [importRow?.ocis, importsRows, shipmentId]);

  const pos = useMemo(() => {
    if (Array.isArray(importRow?.pos) && importRow.pos.length) return importRow.pos;
    const rows = importsRows.filter((r) => (r.shipmentId || "").trim() === shipmentId);
    return Array.from(new Set(rows.map((r) => (r.poNumber || "").trim()).filter(Boolean)));
  }, [importRow?.pos, importsRows, shipmentId]);

  const eta = importRow?.eta || importsRows.find((r) => r.shipmentId === shipmentId)?.eta || "";
  const transportType = importRow?.transportType || importsRows.find((r) => r.shipmentId === shipmentId)?.transportType || "";
  const importStatus  = importRow?.importStatus  || importsRows.find((r) => r.shipmentId === shipmentId)?.importStatus  || "";

  // 2) Items (filtrar por cualquiera de los OCI/PO)
  const { rows: allItems = [], loading: itemsLoading } = useSheet("import_items", mapImportItems);
  const { enrich } = usePresentationCatalog();
  const items = useMemo(() => {
    const setOci = new Set((ocis || []).map((s) => s.trim()));
    const setPo  = new Set((pos  || []).map((s) => s.trim()));

    const filtered = (allItems || []).filter(
      (it) =>
        (setOci.size && setOci.has((it.ociNumber || "").trim())) ||
        (setPo.size  && setPo.has((it.poNumber  || "").trim()))
    );
    return enrich(filtered);
  }, [allItems, ocis, pos, enrich]);

  // 3) Communications refresh
  const { refetch: refetchComms } = useSheet("communications", mapCommunications);
  const handleSavedComm = async () => {
    if (typeof refetchComms === "function") await refetchComms();
    setOpenNewComm(false);
  };

  const transportTone = (t) => (t?.toLowerCase?.() === "air" ? "blue" : t?.toLowerCase?.() === "sea" ? "indigo" : "slate");
  const statusTone = (s) => (s?.toLowerCase?.() === "transit" ? "amber" : s?.toLowerCase?.() === "warehouse" ? "slate" : "gray");

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

        {/* Info top */}
        <div className="grid gap-3 p-4 border-b border-border bg-muted/20 md:grid-cols-3">
          <InfoCard label="OCI Number" value={ocis.length ? ocis.join(", ") : "—"} />
          <InfoCard label="PO Number" value={pos.length ? pos.join(", ") : "—"} />
          <InfoCard label="ETA" value={fmtDate(eta)} />
          <InfoCard label="Transport" value={<Pill tone={transportTone(transportType)}>{transportType || "—"}</Pill>} />
          <InfoCard label="Import Status" value={<Pill tone={statusTone(importStatus)}>{importStatus || "—"}</Pill>} />
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

        {/* Contenido */}
        <div className="p-4 overflow-y-auto h-[calc(100%-210px)]">
          {tab === "items" && (
            <>
              {itemsLoading && <div className="text-sm text-muted-foreground">Loading items…</div>}
              {!itemsLoading && items.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No items found for this shipment.
                  <div className="text-xs mt-1">
                    (Se buscan por <b>OCI</b>: {ocis.length ? ocis.join(", ") : "—"} y/o <b>PO</b>: {pos.length ? pos.join(", ") : "—"} en la hoja <i>import_items</i>).
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {items.map((it, idx) => (
                  <div key={idx} className="bg-muted rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-foreground">
                          {it.productName || it.presentationCode || "Product"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Code: {it.presentationCode || "—"}
                          {it.lotNumber ? <> • Lot: {it.lotNumber}</> : null}
                          {it.expiryDate ? <> • Exp: {fmtDate(it.expiryDate)}</> : null}
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        {(it.currency || "USD") + " " + Number(it.unitPrice || 0).toFixed(2)}
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
                      <Field label="OCI">{it.ociNumber || "—"}</Field>
                      <Field label="PO">{it.poNumber || "—"}</Field>
                      <Field label="QC Status"><Pill tone="emerald">{it.qcStatus || "—"}</Pill></Field>
                      <Field label="Lot">{it.lotNumber || "—"}</Field>
                      <Field label="Qty">{it.qty ?? 0}</Field>
                      <Field label="Unit Price">{(it.currency || "USD") + " " + (it.unitPrice ?? 0)}</Field>
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
              <CommunicationList linkedType="import" linkedId={shipmentId} />
            </div>
          )}
        </div>
      </div>

      {/* Modal Nueva Comunicación */}
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
