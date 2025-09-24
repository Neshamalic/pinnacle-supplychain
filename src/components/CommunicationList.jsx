// src/components/CommunicationList.jsx
import React, { useEffect, useMemo, useState } from "react";
import CommunicationEntry from "@/pages/communications-log/components/CommunicationEntry.jsx";
import { useSheet } from "@/lib/sheetsApi";
import { mapCommunications } from "@/lib/adapters";

export default function CommunicationList({
  linkedType,   // "tender" | "orders" | "imports" (opcional)
  linkedId,     // ej: "621-29-LR25", "PO-171", "EXP-25-26-UK-14" (opcional)
}) {
  const { rows, loading, refetch } = useSheet("communications", mapCommunications);
  const [items, setItems] = useState([]);

  // recalcula items cuando cambian rows o filtros
  useEffect(() => {
    let list = rows || [];
    if (linkedType) list = list.filter(r => (r.linked_type || "") === linkedType);
    if (linkedId)   list = list.filter(r => (r.linked_id   || "") === linkedId);

    // orden por fecha DESC
    list = [...list].sort((a, b) => {
      const ta = new Date(a.createdDate || 0).getTime();
      const tb = new Date(b.createdDate || 0).getTime();
      return tb - ta;
    });
    setItems(list);
  }, [rows, linkedType, linkedId]);

  // Callbacks para borrado optimista / undo
  const handleDeleted = (row) => {
    setItems((arr) => arr.filter((x) => x !== row));
  };
  const handleRestored = (row) => {
    // Si la fila ya no está, la reinserto al inicio
    setItems((arr) => (arr.includes(row) ? arr : [row, ...arr]));
  };

  const empty = !loading && items.length === 0;

  return (
    <div className="space-y-3">
      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {empty && <div className="text-sm text-muted-foreground">No communications found.</div>}

      {items.map((comm) => (
        <CommunicationEntry
          key={`${comm.id || "noid"}_${comm.createdDate || ""}_${comm.subject || ""}`}
          comm={comm}
          onDeleted={handleDeleted}
          onRestored={handleRestored}
          onChange={refetch}
        />
      ))}
    </div>
  );
}
