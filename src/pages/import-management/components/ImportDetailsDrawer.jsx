// src/pages/import-management/components/ImportDetailsDrawer.jsx
import React, { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import { useSheet } from "@/lib/sheetsApi";
import {
  mapImportItems,
  mapImports,
  mapCommunications,
} from "@/lib/adapters";
import { usePresentationCatalog } from "@/lib/catalog";
import CommunicationList from "@/components/CommunicationList";
import NewCommunicationModal from "@/pages/communications-log/components/NewCommunicationModal.jsx";

const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
};

const Pill = ({ children, tone = "slate" }) => {
  const tones = {
    blue: "bg-blue-100 text-blue-700",
    indigo: "bg-indigo-100 text-indigo-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    slate: "bg-slate-100 text-slate-700",
    gray: "bg-gray-100 text-gray-700",
    rose: "bg-rose-100 text-rose-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
        tones[tone] || tones.slate
      }`}
    >
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

  const imp = importRow || {};
  const [tab, setTab] = useState("items");
  const [openNewComm, setOpenNewComm] = useState(false);

  const shipmentId = String(imp?.shipmentId || "").trim();

  // 1) Leemos IMPORTS para resolver OCI/PO del shipment (al agrupar en la tabla principal
  //    puede que no se hayan pasado)
  const { rows: importsRows = [] } = useSheet("imports", mapImports);

  const ociResolved = useMemo(() => {
    // preferimos el que venga en importRow; si no, buscamos en imports por shipmentId
    const candidate =
      (imp.ociNumber || "").trim() ||
      (importsRows.find((r) => r.shipmentId === shipmentId)?.ociNumber || "").trim();
    return candidate || "";
  }, [imp.ociNumber, importsRows, shipmentId]);

  const poResolved = useMemo(() => {
    const candidate =
      (imp.poNumber || "").trim() ||
      (importsRows.find((r) => r.shipmentId === shipmentId)?.poNumber || "").trim();
    return candidate || "";
  }, [imp.poNumber, importsRows, shipmentId]);

  // 2) Leemos IMPORT_ITEMS y filtramos por OCI/PO resueltos
  const { rows: allItems = [], loading: itemsLoading } = useSheet(
    "import_items",
    mapImportItems
  );

  const { enrich } = usePresentationCatalog();
  const items = useMemo(() => {
    const oci = ociResolved;
    const po = poResolved;
    const filtered = (allItems || []).filter(
      (r) =>
        (oci && String(r.ociNumber || "").trim() === oci) ||
        (po && String(r.poNumber || "").trim() === po)
    );
    return enrich(filtered);
  }, [allItems, ociResolved, poResolved, enrich]);

  // 3) Para refrescar Communications después de guardar
  const { refetch: refetchComms } = useSheet("communications", mapCommunications);
  const handleSavedComm = async () => {
    if (typeof refetchComms === "function") await refetchComms();
    setOpenNewComm(false);
  };

  // Tono de pills
  const transportTone = (t) =>
    (t || "").toLowerCase() === "air"
      ? "blue"
      : (t || "").toLowerCase() === "sea"
      ? "indigo"
      : "slate";
  const statusTone = (s) =>
    (s || "").toLowerCase() === "transit"
      ? "amber"
      : (s || "").toLowerCase() === "warehouse"
      ? "slate"
      : "gray";

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

        {/* Info superior */}
        <div className="grid gap-3 p-4 border-b border-border bg-muted/20 md:grid-cols-3">
          <InfoCard label="OCI Number" value={ociResolved || "—"} />
          <InfoCard label="PO Number" value={poResolved || "—"} />
          <InfoCard label="ETA" value={fmtDate(imp?.eta)} />
          <InfoCard
            label="Transport"
            value={<Pill tone={transportTone(imp?.transportType)}>{imp?.transportType || "—"}</Pill>}
          />
          <InfoCard
            label="Import Status"
            value={<Pill tone={statusTone(imp?.importStatus)}>{imp?.importStatus || "—"}</Pill>}
          />
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

        {/* Contenido */}
        <div className="p-4 overflow-y-auto h-[calc(100%-210px)]">
          {tab === "items" && (
            <>
              {itemsLoading && (
                <div className="text-sm text-muted-foreground">Loading items…</div>
              )}
              {!itemsLoading && items.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No items found for this shipment.
                  <br />
                  <span className="text-xs">
                    (Se buscan ítems por <b>OCI</b> {ociResolved ? `"${ociResolved}"` : "—"} y/o{" "}
                    <b>PO</b> {poResolved ? `"${poResolved}"` : "—"} en la hoja
                    <i> import_items</i>).
                  </span>
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
                        {it.currency || "USD"} {Number(it.unitPrice || 0).toFixed(2)}
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
                      <Field label="OCI">{it.ociNumber || "—"}</Field>
                      <Field label="PO">{it.poNumber || "—"}</Field>
                      <Field label="QC Status">
                        <Pill tone="emerald">{it.qcStatus || "—"}</Pill>
                      </Field>
                      <Field label="Lot">{it.lotNumber || "—"}</Field>
                      <Field label="Qty">{it.qty ?? 0}</Field>
                      <Field label="Unit Price">
                        {(it.currency || "USD") + " " + (it.unitPrice ?? 0)}
                      </Field>
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
                <Button size="sm" iconName="Plus" onClick={() => setOpenNewComm(true)}>
                  Add
                </Button>
              </div>
              <CommunicationList linkedType="import" linkedId={shipmentId} />
            </div>
          )}
        </div>
      </div>

      {/* Modal Nueva Comunicación (pre-cargada con Import) */}
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
