// src/pages/communications-log/index.jsx
import React, { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { useSheet } from "@/lib/sheetsApi";
import { mapCommunications } from "@/lib/adapters";
import NewCommunicationModal from "./components/NewCommunicationModal.jsx";

export default function CommunicationsLog() {
  const { rows: all = [], loading, error, reload } = useSheet("communications", mapCommunications);
  const [openNew, setOpenNew] = useState(false);

  // Agrupa por fecha (aaaa-mm-dd)
  const groups = useMemo(() => {
    const map = new Map();
    for (const r of all || []) {
      const d = (r.createdDate || "").slice(0, 10) || "Unknown";
      if (!map.has(d)) map.set(d, []);
      map.get(d).push(r);
    }
    // orden descendente por fecha
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [all]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Communications Log</h1>
          <p className="text-sm text-muted-foreground">
            Track communications and link them to tenders, POs, and imports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={reload}>Refresh Data</Button>
          <Button onClick={() => setOpenNew(true)}>+ New Communication</Button>
        </div>
      </div>

      {/* Lista */}
      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {!loading && groups.length === 0 && (
        <div className="text-sm text-muted-foreground">No communications.</div>
      )}

      <div className="space-y-6">
        {groups.map(([date, items]) => (
          <div key={date} className="space-y-2">
            <div className="text-xs text-muted-foreground">
              {new Date(date).toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </div>
            <div className="space-y-3">
              {items.map((c) => (
                <div key={c.id} className="p-4 rounded-lg border">
                  <div className="text-sm font-medium">{c.subject || "(no subject)"}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.type || "—"}{c.linked_type ? ` · ${c.linked_type.toUpperCase()}` : ""} {c.linked_id ? ` ${c.linked_id}` : ""}
                  </div>
                  {c.content && <div className="text-sm mt-1">{c.content}</div>}
                  {!c.content && <div className="text-xs text-muted-foreground mt-1">(no content)</div>}
                  {c.participants && (
                    <div className="text-xs text-muted-foreground mt-1">Participants: {c.participants}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {openNew && (
        <NewCommunicationModal
          open={openNew}
          onClose={() => setOpenNew(false)}
          onSaved={() => { setOpenNew(false); reload(); }}
        />
      )}
    </div>
  );
}
