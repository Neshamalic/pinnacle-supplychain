// src/pages/communications-log/components/CommunicationTimeline.jsx
import React, { useMemo } from "react";
import { useSheet } from "@/lib/sheetsApi";
import { mapCommunications } from "@/lib/adapters";
import { formatDate } from "@/lib/utils";
import CommunicationEntry from "./CommunicationEntry.jsx";

function groupByDate(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = (r.createdDate || "").slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  }
  return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
}

export default function CommunicationTimeline() {
  const { rows = [], loading, refetch } = useSheet("communications", mapCommunications);

  const grouped = useMemo(() => {
    const list = (rows || [])
      .slice()
      .sort((a, b) => (b.createdDate || "").localeCompare(a.createdDate || ""));
    return groupByDate(list);
  }, [rows]);

  if (loading) return <div className="text-sm text-muted-foreground">Cargando…</div>;
  if (!rows.length) return <div className="text-sm text-muted-foreground">No hay comunicaciones.</div>;

  return (
    <div className="space-y-6">
      {grouped.map(([day, list]) => (
        <div key={day}>
          <div className="text-xs text-muted-foreground mb-2">{formatDate(day)}</div>
          <div className="space-y-2">
            {list.map((c) => (
              <CommunicationEntry
                key={c.id || c.createdDate + c.subject}
                comm={c}
                onDeleted={refetch}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
