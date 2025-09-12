// src/pages/import-management/index.jsx
import React, { useMemo, useState } from "react";
import { RefreshCcw, Search, Eye } from "lucide-react";
import Button from "@/components/ui/Button";
import { useSheet } from "@/lib/sheetsApi";
import { mapImports } from "@/lib/adapters";
import ImportDetailsDrawer from "./components/ImportDetailsDrawer";

const norm = (s = "") => String(s || "").trim().toLowerCase();

const statusBadge = (status) => {
  const s = norm(status);
  if (s === "warehouse") return "bg-slate-100 text-slate-700";
  if (s === "transit") return "bg-amber-100 text-amber-700";
  if (s === "customs" || s.includes("custom")) return "bg-blue-100 text-blue-700";
  if (s === "delivered" || s === "arrived") return "bg-green-100 text-green-700";
  return "bg-gray-100 text-gray-700";
};

export default function ImportManagement() {
  const {
    rows: impRaw = [],
    loading,
    error,
    reload,
  } = useSheet("imports", mapImports);

  const [q, setQ] = useState("");

  // Agrupar por shipmentId
  const groups = useMemo(() => {
    const map = new Map();
    for (const r of impRaw || []) {
      const key = r.shipmentId || r.shipment_id || r.id;
      if (!key) continue;
      if (!map.has(key)) {
        map.set(key, {
          shipmentId: key,
          ociNumber: r.ociNumber || r.oci || "",
          poNumber: r.poNumber || r.po || "",
          transportType: r.transportType || r.transport || "",
          importStatus: r.importStatus || r.status || "",
          _rows: [],
        });
      }
      map.get(key)._rows.push(r);
      // priorizar estatus “transit -> customs -> warehouse -> delivered”
      const order = ["transit", "customs", "warehouse", "delivered", "arrived"];
      const g = map.get(key);
      const a = norm(g.importStatus);
      const b = norm(r.importStatus || r.status);
      if (!a || (order.indexOf(b) >= 0 && order.indexOf(b) < order.indexOf(a))) {
        g.importStatus = r.importStatus || r.status || g.importStatus;
      }
      // preferimos último transport si está vacío
      if (!g.transportType && r.transportType) g.transportType = r.transportType;
      if (!g.ociNumber && r.ociNumber) g.ociNumber = r.ociNumber;
      if (!g.poNumber && r.poNumber) g.poNumber = r.poNumber;
    }
    return Array.from(map.values()).sort((a, b) =>
      String(a.shipmentId).localeCompare(String(b.shipmentId))
    );
  }, [impRaw]);

  const filtered = useMemo(() => {
    if (!q.trim()) return groups;
    const n = norm(q);
    return groups.filter(
      (g) =>
        norm(g.shipmentId).includes(n) ||
        norm(g.ociNumber).includes(n) ||
        norm(g.poNumber).includes(n)
    );
  }, [groups, q]);

  // Drawer
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  return (
    <div className="px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Import Management</h1>
          <p className="text-sm text-muted-foreground">
            Track incoming shipments from suppliers and customs status.
          </p>
        </div>
        <Button variant="outline" onClick={reload}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Filtros */}
      <div className="rounded-lg border p-3 mb-4">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-md border bg-background text-sm outline-none"
            placeholder="Search shipments by Shipment ID, OCI or PO…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2 text-xs text-muted-foreground bg-muted/40">
          <div className="col-span-3">Shipment ID</div>
          <div className="col-span-2">OCI</div>
          <div className="col-span-2">PO</div>
          <div className="col-span-2">Transport</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {loading && (
          <div className="px-4 py-6 text-sm text-muted-foreground">Loading…</div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="px-4 py-6 text-sm text-muted-foreground">
            No imports found.
          </div>
        )}

        {!loading &&
          filtered.map((g) => (
            <div key={g.shipmentId} className="grid grid-cols-12 px-4 py-3 border-t items-center">
              <div className="col-span-3 font-medium">{g.shipmentId}</div>
              <div className="col-span-2 text-sm text-muted-foreground">{g.ociNumber || "—"}</div>
              <div className="col-span-2 text-sm text-muted-foreground">{g.poNumber || "—"}</div>
              <div className="col-span-2 text-sm">{g.transportType || "—"}</div>
              <div className="col-span-2">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(g.importStatus)}`}>
                  {g.importStatus || "—"}
                </span>
              </div>
              <div className="col-span-1 flex items-center justify-end">
                <button
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  onClick={() => {
                    setCurrent({
                      shipmentId: g.shipmentId,
                      ociNumber: g.ociNumber,
                      poNumber: g.poNumber,
                      transportType: g.transportType,
                      importStatus: g.importStatus,
                      // mantenemos el resto accesible en el drawer
                    });
                    setOpen(true);
                  }}
                >
                  <Eye className="h-4 w-4" /> View Details
                </button>
              </div>
            </div>
          ))}
      </div>

      {open && current && (
        <ImportDetailsDrawer
          isOpen={open}
          onClose={() => setOpen(false)}
          importRow={current}
        />
      )}
    </div>
  );
}
