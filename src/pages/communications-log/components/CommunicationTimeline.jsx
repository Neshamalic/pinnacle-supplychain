// src/pages/communications-log/components/CommunicationTimeline.jsx
import React, { useEffect, useState } from "react";
import { useSheet } from "@/lib/sheetsApi";
import { mapCommunications } from "@/lib/adapters";
import CommunicationEntry from "./CommunicationEntry.jsx";

export default function CommunicationTimeline() {
  const { rows, loading, refetch } = useSheet("communications", mapCommunications);
  const [items, setItems] = useState([]);

  useEffect(() => {
    // Orden por fecha DESC
    const list = [...(rows || [])].sort((a, b) => {
      const ta = new Date(a.createdDate || 0).getTime();
      const tb = new Date(b.createdDate || 0).getTime();
      return tb - ta;
    });
    setItems(list);
  }, [rows]);

  const handleDeleted = (row) => {
    setItems((arr) => arr.filter((x) => x !== row));
  };

  const handleRestored = (row) => {
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
