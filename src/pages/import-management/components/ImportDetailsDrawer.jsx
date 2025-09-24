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

  // Fallback a "imports" si no llegan ocis/pos desde la tabla
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

  const eta           = importRow?.eta           || importsRows.find((r) => r.shipmentId === shipmentId)?.eta           || "";
  const transportType = importRow?.transportType || importsRows.find((r) => r.shipmentId === shipmentId)?.transportType || "";
  const importStatus  = importRow?.importStatus  || importsRows.find((r) => r.shipmentId === shipmentId)?.importStatus  || "";

  // Items + DEDUP ULTRA (antes y después del enrich)
  const { rows: allItems = [], loading: itemsLoading } = useSheet("import_items", mapImportItems);
  const { enrich } = usePresentationCatalog();

  const items = useMemo(() => {
    const setOci = new Set((ocis || []).map((s) => s.trim()));
    const setPo  = new Set((pos  || []).map((s) => s.trim()));

    // 1) Filtrado por OCI/PO
    const filtered = (allItems || []).filter(
      (it) =>
        (setOci.size && setOci.has((it.ociNumber || "").trim())) ||
        (setPo.size  && setPo.has((it.poNumber  || "").trim()))
    );

    // 2) Dedup por clave estable oci|po|code|lot (TRIM siempre)
    const toKey = (it) =>
      [
        (it.ociNumber || "").trim(),
        (it.poNumber || "").trim(),
        (it.presentationCode || "").trim(),
        (it.lotNumber || "").trim(),
      ].join("|");

    const preMap = new Map();
    for (const it of filtered) {
      preMap.set(toKey(it), it);
    }
    const preUnique = Array.from(preMap.values());

    // 3) Enrichment
    const enriched = enrich(preUnique);

    // 4) Dedup otra vez post-enrichment por la misma clave
    const postMap = new Map();
    for (const it of enriched) {
      postMap.set(toKey(it), it);
    }
    return Array.from(postMap.values());
  }, [allItems, ocis, pos, enrich]);

  // Communications
  const { refetch: refetchComms } = useSheet("communications", mapCommunications);
  const handleSavedComm = async () => {
    if (typeof refetchComms === "function") await refetchComms();
