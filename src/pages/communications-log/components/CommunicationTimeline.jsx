// src/pages/communications-log/components/CommunicationTimeline.jsx
import React, { useMemo } from "react";
import { useSheet } from "@/lib/sheetsApi";
import { mapCommunications } from "@/lib/adapters";
import { formatDate } from "@/lib/utils";
import CommunicationEntry from "./CommunicationEntry.jsx";

function groupByDate(rows) {
  const m = new Map();
  for (const r of rows) {
    const day = String(r.createdDate || "").slice(0, 10);
    if (!m.has(day)) m.set(day, []);
    m.get(day).push(r);
  }
  return Array.from(m.entries()).sort(([a],[b]) => b.localeCompare(a));
}

export default function CommunicationTimeline() {
  const { rows = [], loading, refetch } = useSheet("communications", mapCommunications);

  const grouped = useMemo(() => {
    const list = (rows || [])
      .filter(r => !r.deleted)
      .sort((a, b) => (b.createdDate || "").localeCompare(a.createdDate || ""));
    return groupByDate(list);
  }, [rows]);

  if (loading) return <div className="text-sm text-muted-foreground">Cargando…</div>;
  if (!grouped.length) return <div>No hay comunicaciones.</div>;

  return (
    <div className="space-y-6">
      {grouped.map(([day, list]) => (
        <div key={day}>
          <div className="text-xs text-muted-foreground mb-2">{formatDate(day)}</div>
          <div className="space-y-2">
            {list.map(c => (
              <CommunicationEntry key={c.id || c.createdDate + c.subject} comm={c} onChange={refetch} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
