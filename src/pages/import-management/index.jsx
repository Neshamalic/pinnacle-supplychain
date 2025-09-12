// src/pages/import-management/index.jsx
import React, { useMemo, useState } from "react";
import { RefreshCcw, Search, Eye, Ship, Plane, Truck, Boxes } from "lucide-react";
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
  const { rows: impRaw = [], loading, reload } = useSheet("imports", mapImports);

  // ====== Agrupar por Shipment ID ======
  const groups = useMemo(() => {
    const map = new Map();
    for (const r of impRaw || []) {
      // tratamos de encontrar un id de shipment robustamente
      let key =
        r.shipmentId ||
        r.shipment_id ||
        r.shipmentID ||
        r.ShipmentID ||
        r.id;

      if (!key) {
        const dyn = Object.keys(r || {}).find((k) =>
          k.toLowerCase().includes("shipment") && r[k]
        );
        key = dyn ? r[dyn] : null;
      }
      if (!key) continue;

      if (!map.has(key)) {
        map.set(key, {
          shipmentId: key,
          ociNumber: r.ociNumber || r.oci || "",
          poNumber: r.poNumber || r.po || "",
          transportType: r.transportType || r.transport || "",
          importStatus: r.importStatus || r.status || "",
          qcStatus: r.qcStatus || "",
          customsStatus: r.customsStatus || "",
          _rows: [],
        });
      }
      const g = map.get(key);
      g._rows.push(r);

      // priorizamos estados
      const order = ["transit", "customs", "warehouse", "delivered", "arrived"];
      const a = order.indexOf(norm(g.importStatus));
      const b = order.indexOf(norm(r.importStatus || r.status));
      if (a === -1 || (b >= 0 && b < a)) g.importStatus = r.importStatus || r.status || g.importStatus;

      // completar campos del grupo
      if (!g.transportType && (r.transportType || r.transport))
        g.transportType = r.transportType || r.transport || "";
      if (!g.ociNumber && (r.ociNumber || r.oci)) g.ociNumber = r.ociNumber || r.oci || "";
      if (!g.poNumber && (r.poNumber || r.po)) g.poNumber = r.poNumber || r.po || "";
      if (!g.qcStatus && r.qcStatus) g.qcStatus = r.qcStatus;
      if (!g.customsStatus && r.customsStatus) g.customsStatus = r.customsStatus;
    }

    return Array.from(map.values()).sort((a, b) =>
      String(a.shipmentId).localeCompare(String(b.shipmentId))
    );
  }, [impRaw]);

  // ====== KPI ======
  const kpis = useMemo(() => {
    const total = groups.length;
    const transit = groups.filter((g) => norm(g.importStatus) === "transit").length;
    const warehouse = groups.filter((g) => norm(g.importStatus) === "warehouse").length;
    const delivered =
      groups.filter((g) => ["delivered", "arrived"].includes(norm(g.importStatus))).length;
    return { total, transit, warehouse, delivered };
  }, [groups]);

  // ====== Filtros ======
  const [q, setQ] = useState("");
  const [transport, setTransport] = useState("");
  const [qc, setQc] = useState("");
  const [customs, setCustoms] = useState("");
  const [showMore, setShowMore] = useState(false);

  const transportOpts = useMemo(
    () => Array.from(new Set(groups.map((g) => g.transportType).filter(Boolean))).sort(),
    [groups]
  );
  const qcOpts = useMemo(
    () => Array.from(new Set(groups.map((g) => g.qcStatus).filter(Boolean))).sort(),
    [groups]
  );
  const customsOpts = useMemo(
    () => Array.from(new Set(groups.map((g) => g.customsStatus).filter(Boolean))).sort(),
    [groups]
  );

  const filtered = useMemo(() => {
    let list = groups;
    if (q.trim()) {
      const n = norm(q);
      list = list.filter(
        (g) =>
          norm(g.shipmentId).includes(n) ||
          norm(g.ociNumber).includes(n) ||
          norm(g.poNumber).includes(n)
      );
    }
    if (transport) list = list.filter((g) => norm(g.transportType) === norm(transport));
    if (qc) list = list.filter((g) => norm(g.qcStatus) === norm(qc));
    if (customs) list = list.filter((g) => norm(g.customsStatus) === norm(customs));
    return list;
  }, [groups, q, transport, qc, customs]);

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

      {/* KPI Cards (íconos) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border p-4 flex items-center gap-3">
          <Boxes className="h-6 w-6 text-muted-foreground" />
          <div>
            <div className="text-xs text-muted-foreground">Total Shipments</div>
            <div className="text-2xl font-semibold">{kpis.total}</div>
          </div>
        </div>
        <div className="rounded-lg border p-4 flex items-center gap-3">
          <Ship className="h-6 w-6 text-amber-600" />
          <div>
            <div className="text-xs text-muted-foreground">In Transit</div>
            <div className="text-2xl font-semibold">{kpis.transit}</div>
          </div>
        </div>
        <div className="rounded-lg border p-4 flex items-center gap-3">
          <Truck className="h-6 w-6 text-slate-600" />
          <div>
            <div className="text-xs text-muted-foreground">Warehouse</div>
            <div className="text-2xl font-semibold">{kpis.warehouse}</div>
          </div>
        </div>
        <div className="rounded-lg border p-4 flex items-center gap-3">
          <Plane className="h-6 w-6 text-green-600" />
          <div>
            <div className="text-xs text-muted-foreground">Delivered / Arrived</div>
            <div className="text-2xl font-semibold">{kpis.delivered}</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-lg border p-3 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <input
              className="w-full pl-9 pr-3 py-2 rounded-md border bg-background text-sm outline-none"
              placeholder="Search shipments by Shipment ID, OCI or PO…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <button
            className="text-sm text-muted-foreground underline"
            onClick={() => setShowMore((s) => !s)}
          >
            {showMore ? "Hide Filters" : "Show More Filters"}
          </button>

          <Button variant="ghost" onClick={() => { setQ(""); setTransport(""); setQc(""); setCustoms(""); }}>
            Clear Filters
          </Button>
        </div>

        {showMore && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={transport}
              onChange={(e) => setTransport(e.target.value)}
              className="h-9 rounded-md border bg-background text-sm px-3"
            >
              <option value="">Transport (all)</option>
              {transportOpts.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>

            <select
              value={qc}
              onChange={(e) => setQc(e.target.value)}
              className="h-9 rounded-md border bg-background text-sm px-3"
            >
              <option value="">QC Status (all)</option>
              {qcOpts.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>

            <select
              value={customs}
              onChange={(e) => setCustoms(e.target.value)}
              className="h-9 rounded-md border bg-background text-sm px-3"
            >
              <option value="">Customs Status (all)</option>
              {customsOpts.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabla agrupada por Shipment ID */}
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
          <div className="px-4 py-6 text-sm text-muted-foreground">No imports found.</div>
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
                      ...g, // incluye shipmentId, ociNumber, poNumber, transportType, importStatus
                      rows: g._rows,
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
