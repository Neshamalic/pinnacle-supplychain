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
    tone === "green"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "yellow"
      ? "bg-amber-100 text-amber-700"
      : tone === "blue"
      ? "bg-sky-100 text-sky-700"
      : tone === "red"
      ? "bg-rose-100 text-rose-700"
      : "bg-muted text-foreground/70";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{children}</span>;
};

export default function ImportDetailsDrawer(props) {
  // Compatibilidad con distintos nombres de props en tu app
  const isOpen = props.isOpen ?? props.open ?? false;
  const imp =
    props.importRow ||
    props.importData ||
    props.import ||
    props.shipment ||
    props.data ||
    props.row ||
    null;
  const onClose = props.onClose || props.close || (() => {});

  const [tab, setTab] = useState("overview");
  const [openNewComm, setOpenNewComm] = useState(false);

  // Para refrescar la lista al guardar una nueva comunicación
  const { refetch: refetchComms } = useSheet("communications", mapCommunications);

  if (!isOpen || !imp) return null;

  /* 1) Import items (hoja: import_items) */
  const { rows: allImportItems = [], loading } = useSheet("import_items", mapImportItems);

  /* 2) Filtrado por prioridad: shipmentId -> ociNumber -> poNumber */
  const itemsRaw = useMemo(() => {
    const list = [];
    const sid = imp.shipmentId || imp.shipment_id || imp.shipmentID;
    const oci = imp.ociNumber || imp.oci_number || imp.oci;
    const po  = imp.poNumber  || imp.po_number  || imp.po;
    for (const r of allImportItems || []) {
      if (sid && (r.shipmentId === sid || r.shipment_id === sid)) { list.push(r); continue; }
      if (!sid && oci && (r.ociNumber === oci || r.oci_number === oci)) { list.push(r); continue; }
      if (!sid && !oci && po && (r.poNumber === po || r.po_number === po)) { list.push(r); continue; }
    }
    return list;
  }, [allImportItems, imp]);

  /* 3) Enriquecer con product master (product_name y package_units) */
  const { enrich } = usePresentationCatalog();
  const items = useMemo(() => enrich(itemsRaw), [itemsRaw, enrich]); // añade productName/packageUnits según tu catálogo

  const shipmentId = imp.shipmentId || imp.shipment_id || "";
  const ociNumber  = imp.ociNumber  || imp.oci_number  || "—";
  const poNumber   = imp.poNumber   || imp.po_number   || "—";

  const qcTone = (s) =>
    (s || "").toLowerCase() === "approved" ? "green" :
    (s || "").toLowerCase().includes("progress") || (s || "").toLowerCase().includes("pending") ? "yellow" :
    "muted";

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
            <div className="text-sm text-muted-foreground">Shipment ID: {shipmentId || "—"}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <Icon name="X" size={18} />
          </Button>
        </div>

        {/* Top info cards */}
        <div className="grid gap-3 p-4 border-b border-border bg-muted/20 md:grid-cols-3">
          <InfoCard label="OCI Number" value={ociNumber} />
          <InfoCard label="PO Number" value={poNumber} />
          <InfoCard label="ETA" value={fmtDate(imp.eta || imp.arrivalDate)} />
          <InfoCard label="Transport" value={<Pill tone="blue">{imp.transportType || "—"}</Pill>} />
          <InfoCard label="Import Status" value={<Pill tone="blue">{imp.importStatus || imp.status || "—"}</Pill>} />
          <InfoCard label="QC Status" value={<Pill tone={qcTone(imp.qcStatus)}>{imp.qcStatus || "—"}</Pill>} />
          <InfoCard label="Customs" value={<Pill tone="yellow">{imp.customsStatus || "—"}</Pill>} />
          <InfoCard label="Location" value={imp.location || imp.destination || "—"} />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border px-4">
          {[
            ["overview", "Overview", "Info"],
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
          {tab === "overview" && (
            <div className="rounded-lg border p-4 bg-background">
              <div className="text-sm text-muted-foreground">
                Resumen del embarque y estados. Usa las otras pestañas para ver el detalle de ítems y el historial de comunicaciones.
              </div>
            </div>
          )}

          {tab === "items" && (
            <div className="space-y-3">
              {(items || []).map((it, idx) => (
                <div key={idx} className="bg-muted rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">
                        {it.productName || it.presentationCode || "Product"}
                        {it.packageUnits ? (
                          <span className="text-muted-foreground"> • {it.packageUnits} units/pack</span>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Code: {it.presentationCode || "—"} {it.lotNumber ? `• Lot: ${it.lotNumber}` : ""}
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      Qty: <span className="font-medium">{it.qty || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
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
              {/* Lista de comunicaciones para ESTE import */}
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
