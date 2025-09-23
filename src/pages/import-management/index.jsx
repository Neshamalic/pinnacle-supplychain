// src/pages/import-management/index.jsx
import React, { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import { useSheet } from "@/lib/sheetsApi";
import { mapImports } from "@/lib/adapters";
import ImportDetailsDrawer from "./components/ImportDetailsDrawer.jsx";

const fmt = (v) => (v ?? "—");
const badge = (txt) => (
  <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
    {txt || "—"}
  </span>
);

export default function ImportManagementPage() {
  const { rows: imports = [], loading, error, refetch, refresh } = useSheet("imports", mapImports);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);

  const doRefresh = async () => {
    if (typeof refetch === "function") await refetch();
    else if (typeof refresh === "function") await refresh();
  };

  // Filtro por búsqueda
  const filtered = useMemo(() => {
    const s = (q || "").toLowerCase().trim();
    if (!s) return imports || [];
    return (imports || []).filter((r) => {
      const hay = [
        r.shipmentId, r.shipment_id,
        r.ociNumber, r.oci_number,
        r.poNumber, r.po_number,
        r.importStatus, r.transportType,
      ]
        .map((x) => String(x || "").toLowerCase())
        .some((x) => x.includes(s));
      return hay;
    });
  }, [imports, q]);

  // Métricas (ejemplo simple por estado)
  const total = filtered.length;
  const inTransit = filtered.filter((r) => String(r.importStatus || r.status || "").toLowerCase().includes("transit")).length;
  const warehouse = filtered.filter((r) => String(r.importStatus || r.status || "").toLowerCase().includes("warehouse")).length;
  const delivered = filtered.filter((r) => String(r.importStatus || r.status || "").toLowerCase().includes("delivered")).length;

  return (
    <div className="p-6">
      <div className="mb-1 text-2xl font-semibold">Import Management</div>
      <p className="mb-4 text-gray-600">Track incoming shipments from suppliers and customs status.</p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatCard icon="PackageSearch" label="Total Shipments" value={total} />
        <StatCard icon="Plane" label="In Transit" value={inTransit} />
        <StatCard icon="Warehouse" label="Warehouse" value={warehouse} />
        <StatCard icon="CircleCheck" label="Delivered / Arrived" value={delivered} />
        <div className="ml-auto">
          <Button variant="secondary" onClick={doRefresh}>
            <Icon name="RotateCw" className="mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      <div className="mb-3">
        <input
          className="w-full rounded-lg border px-3 py-2"
          placeholder="Search shipments by Shipment ID, OCI or PO..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading && <div className="text-sm text-muted-foreground">Loading imports…</div>}
      {error && <div className="text-sm text-rose-600">Error: {String(error)}</div>}

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Shipment ID</th>
              <th className="px-4 py-3 font-medium">OCI</th>
              <th className="px-4 py-3 font-medium">PO</th>
              <th className="px-4 py-3 font-medium">Transport</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(filtered || []).map((r) => {
              const shipmentId = r.shipmentId || r.shipment_id;
              const oci = r.ociNumber || r.oci_number;
              const po = r.poNumber || r.po_number;
              const transport = r.transportType || r.transport_type;
              const status = r.importStatus || r.status;
              return (
                <tr key={String(shipmentId)} className="border-t">
                  <td className="px-4 py-3">{fmt(shipmentId)}</td>
                  <td className="px-4 py-3">{fmt(oci) === "—" ? "—" : fmt(oci)}</td>
                  <td className="px-4 py-3">{fmt(po)}</td>
                  <td className="px-4 py-3">{badge(transport)}</td>
                  <td className="px-4 py-3">{badge(status)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSelected(r)}
                    >
                      <Icon name="Eye" className="mr-2" />
                      View Details
                    </Button>
                  </td>
                </tr>
              );
            })}
            {(!filtered || filtered.length === 0) && (
              <tr>
                <td className="px-4 py-6 text-center text-muted-foreground" colSpan={6}>
                  No shipments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      {selected && (
        <ImportDetailsDrawer
          isOpen={!!selected}
          importRow={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm">
      <Icon name={icon} />
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
    </div>
  );
}
