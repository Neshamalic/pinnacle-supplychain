// src/pages/communications-log/index.jsx
import React from "react";
import { useSheet } from "../../lib/sheetsApi";
import { mapCommunications } from "../../lib/adapters";

export default function CommunicationsLog() {
  const { rows, loading, error } = useSheet("communications", mapCommunications);

  if (loading) return <div className="p-6">Cargando comunicaciones…</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Communications Log</h1>
      {rows.length === 0 ? (
        <div className="text-muted-foreground">No hay comunicaciones.</div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="border rounded p-3">
              <div className="font-medium">{r.subject || "(Sin asunto)"}</div>
              <div className="text-sm text-muted-foreground">
                {r.type} · {r.createdDate || "sin fecha"}
              </div>
              {r.preview && <div className="mt-1 text-sm">{r.preview}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
