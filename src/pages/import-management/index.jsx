// src/pages/import-management/index.jsx
import React, { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { useSheet } from "@/lib/sheetsApi";
import { mapImports } from "@/lib/adapters";
import ImportDetailsDrawer from "./components/ImportDetailsDrawer.jsx";

export default function ImportManagement() {
  const { rows: allImports = [], loading, error, reload } = useSheet("imports", mapImports);

  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const list = allImports || [];
    if (!q) return list;
    const s = q.trim().toLowerCase();
    return list.filter((r) =>
      (r.shipmentId || "").toLowerCase().includes(s) ||
      (r.ociNumber || "").toLowerCase().includes(s) ||
      (r.poNumber || "").toLowerCase().includes(s)
    );
  }, [allImports, q]);

  const onClickView = (row) => {
    setSelected(row);
    setOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Import Management</h1>
          <p className="text-sm text-muted-foreground">
            Track incoming shipments from suppliers and customs status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={reload}>Refresh Data</Button>
        </div>
      </div>

      {/* Filtros mínimos */}
      <div className="rounded-lg border p-4 space-y-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search shipments…"
          className="w-full h-10 px-3 rounded-md border bg-background"
        />
      </div>

      {/* Tabla */}
      <div className="rounded-lg border overflow-hidden">
        <div className="grid grid-cols-6 gap-0 px-4 py-3 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
          <div>Shipment ID</div>
          <div>OCI</div>
          <div>PO</div>
          <div>Transport</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
        </div>

        {loading && (
          <div className="px-4 py-6 text-sm text-muted-foreground">Loading…</div>
        )}
        {!loading && rows.length === 0 && (
          <div className="px-4 py-6 text-sm text-muted-foreground">No imports found.</div>
        )}

        {rows.map((r) => (
          <div key={r.id || r.shipmentId || r.ociNumber || r.poNumber} className="grid grid-cols-6 gap-0 px-4 py-3 border-b text-sm">
            <div className="font-medium">{r.shipmentId || "—"}</div>
            <div>{r.ociNumber || "—"}</div>
            <div>{r.poNumber || "—"}</div>
            <div className="capitalize">{r.transportType || "—"}</div>
            <div className="capitalize">{r.importStatus || "—"}</div>
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => onClickView(r)}>View Details</Button>
            </div>
          </div>
        ))}
      </div>

      {open && selected && (
        <ImportDetailsDrawer
          isOpen={open}
          onClose={() => { setOpen(false); setSelected(null); }}
          importRow={selected}
        />
      )}
    </div>
  );
}
