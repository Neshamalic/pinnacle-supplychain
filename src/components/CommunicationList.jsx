// src/components/CommunicationList.jsx
import React, { useMemo } from "react";
import { useSheet } from "@/lib/sheetsApi";
import { mapCommunications } from "@/lib/adapters";

export default function CommunicationList({ linkedType, linkedId }) {
  const { rows = [], loading } = useSheet("communications", mapCommunications);

  const list = useMemo(() => {
    const lt = (linkedType || "").toLowerCase();
    const id = (linkedId || "").trim().toLowerCase();
    return (rows || []).filter(
      (r) =>
        (r.linked_type || "").toLowerCase() === lt &&
        (r.linked_id || "").trim().toLowerCase() === id
    );
  }, [rows, linkedType, linkedId]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading communications…</div>;

  if (!list.length)
    return <div className="text-sm text-muted-foreground">No communications linked.</div>;

  return (
    <div className="space-y-3">
      {list.map((c) => (
        <div key={c.id || `${c.subject}-${c.createdDate}`} className="rounded border p-3">
          <div className="text-sm font-medium">{c.subject || "(no subject)"}</div>
          <div className="text-xs text-muted-foreground">
            {c.type || "—"} • {new Date(c.createdDate || Date.now()).toLocaleString()}
          </div>
          {c.content ? <div className="mt-2 text-sm">{c.content}</div> : null}
          {c.participants ? (
            <div className="mt-2 text-xs text-muted-foreground">Participants: {c.participants}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
