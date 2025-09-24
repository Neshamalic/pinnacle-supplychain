// src/pages/communications-log/components/CommunicationTimeline.jsx
import React, { useMemo } from "react";
import { useSheet } from "@/lib/sheetsApi";
import { mapCommunications } from "@/lib/adapters";
import CommunicationEntry from "./CommunicationEntry";
import { formatDate } from "@/lib/utils";

function groupByDay(list) {
  const map = new Map();
  list.forEach(item => {
    const k = (item.createdDate || "").slice(0, 10); // YYYY-MM-DD
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  });
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, items]) => ({ day: key, items }));
}

export default function CommunicationTimeline() {
  const { rows = [], loading, refetch } = useSheet("communications", mapCommunications);

  const groups = useMemo(() => {
    const clean = (rows || [])
      .filter(r => !r.deleted) // << filtra borrados
      .sort((a, b) => (b.createdDate || "").localeCompare(a.createdDate || ""));
    return groupByDay(clean);
  }, [rows]);

  if (loading) return <div className="text-sm text-muted-foreground">Cargando comunicaciones…</div>;
  if (!groups.length) return <div className="text-sm text-muted-foreground">No hay comunicaciones registradas.</div>;

  return (
    <div className="space-y-6">
      {groups.map(({ day, items }) => (
        <div key={day}>
          <div className="text-xs font-medium text-muted-foreground mb-2">{formatDate(day)}</div>
          <div className="space-y-2">
            {items.map((it) => (
              <CommunicationEntry key={it.id || it.createdDate + it.subject} comm={it} onChange={refetch} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
