// src/components/CommunicationList.jsx
import React, { useMemo } from "react";
import { useSheet } from "@/lib/sheetsApi";
import { mapCommunications } from "@/lib/adapters";

export default function CommunicationList({ linkedType, linkedId }) {
  const { rows = [], loading } = useSheet("communications", mapCommunications);

  const list = useMemo(() => {
    const lt = (linkedType || "").toLowerCase();
    const id = String(linkedId || "").trim();
    return (rows || [])
      .filter((r) => (r.linked_type || "") === lt && String(r.linked_id || "") === id)
      .sort((a, b) => (a.createdDate || "").localeCompare(b.createdDate || ""));
  }, [rows, linkedType, linkedId]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (list.length === 0) return <div className="text-sm text-muted-foreground">No communications.</div>;

  return (
    <div className="space-y-2">
      {list.map((c) => (
        <div key={c.id || `${c.linked_id}-${c.createdDate}`} className="p-3 rounded-lg border bg-card">
          <div className="text-sm font-medium">{c.subject || "(no subject)"}</div>
          <div className="text-xs text-muted-foreground">
            {c.createdDate?.slice(0, 16).replace("T", " ")} · {c.type || "—"} · {c.participants || "—"}
          </div>
          {c.content ? (
            <div className="text-sm mt-1 whitespace-pre-line">{c.content}</div>
          ) : (
            <div className="text-xs text-muted-foreground mt-1">(no content)</div>
          )}
        </div>
      ))}
    </div>
  );
}
