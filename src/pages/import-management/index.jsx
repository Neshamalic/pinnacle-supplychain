// src/pages/import-management/index.jsx
import React, { useMemo, useState } from "react";
import Icon from "@/components/AppIcon";
import Button from "@/components/ui/Button";
import { useSheet } from "@/lib/sheetsApi";
import { mapImports, mapImportItems, _utils } from "@/lib/adapters";
import ImportDetailsDrawer from "./components/ImportDetailsDrawer";

const { toNumber } = _utils;

const Badge = ({ children, tone = "neutral" }) => {
  const tones = {
    neutral: "bg-muted text-foreground/80",
    green: "bg-emerald-100 text-emerald-700",
    yellow: "bg-amber-100 text-amber-700",
    red: "bg-rose-100 text-rose-700",
    blue: "bg-sky-100 text-sky-700",
    gray: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${tones[tone] || tones.neutral}`}>
      {children}
    </span>
  );
};

const qcTone = (s) => {
  switch ((s || "").toLowerCase()) {
    case "approved": return "green";
    case "in-progress": return "yellow";
    case "pending": return "red";
    default: return "gray";
  }
};

const statusTone = (s) => (s === "warehouse" ? "green" : "blue");

export default function ImportManagement() {
  // ✅ datos desde Google Sheets
  const { rows: imports = [], loading: l1, error: e1 } = useSheet("imports", mapImports);
  const { rows: importItems = [], loading: l2, error: e2 } = useSheet("import_items", mapImportItems);

  const [filters, setFilters] = useState({ transport: "", qc: "", imp: "" });
  const [selected, setSelected] = useState(null);

  // QC agregado por shipment (si hay algún pending -> pending; si no, si hay in-progress -> in-progress; si no -> approved)
  const qcByShipment = useMemo(() => {
    const order = { pending: 0, "in-progress": 1, approved: 2 };
    const res = {};
    for (const it of importItems) {
      const key = it.shipmentId || "";
      if (!key) continue;
      const s = (it.qcStatus || "").toLowerCase();
      if (!res[key]) res[key] = "approved";
      if (s in order && order[s] < order[res[key]]) res[key] = s;
    }
    return res;
  }, [importItems]);

  // Total por shipment (si no viene “totalCostClp”, sumamos CLP de items)
  const totalByShipment = useMemo(() => {
    const res = {};
    for (const it of importItems) {
      if (!it.shipmentId) continue;
      if (it.currency === "CLP") {
        const val = toNumber(it.qty) * toNumber(it.unitPrice);
        res[it.shipmentId] = (res[it.shipmentId] || 0) + val;
      }
    }
    return res;
  }, [importItems]);

  // aplica filtros
  const rows = useMemo(() => {
    return (imports || []).filter((r) => {
      if (!r) return false;
      if (filters.transport && r.transportType !== filters.transport) return false;
      if (filters.imp && r.importStatus !== filters.imp) return false;
      if (filters.qc && (qcByShipment[r.id] || "approved") !== filters.qc) return false;
      return true;
    });
  }, [imports, qcByShipment, filters]);

  // Tarjetas KPI
  const kpis = useMemo(() => {
    const active = rows.length;
    const pendingQC = importItems.filter((x) => (x.qcStatus || "").toLowerCase() === "pending").length;
    const inWarehouse = rows.filter((r) => r.importStatus === "warehouse").length;
    const totalClp = rows.reduce((acc, r) => acc + (r.totalCostClp || totalByShipment[r.id] || 0), 0);
    return { active, pendingQC, inWarehouse, totalClp };
  }, [rows, importItems, totalByShipment]);

  if (l1 || l2) return <div className="p-6">Loading imports…</div>;
  if (e1 || e2) return <div className="p-6 text-red-600">Error: {String(e1 || e2)}</div>;

  return (
    // ⬇️ No usamos contenedores que cubran toda la pantalla, así el layout (barra superior) se ve normal
    <div className="px-6 py-6 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Import Management</h1>
            <p className="text-sm text-muted-foreground">
              Track incoming shipments from arrival through quality control completion
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" iconName="Download">Export Data</Button>
            <Button variant="default" iconName="RefreshCcw">Refresh Data</Button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Icon name="Package" size={16} /> Active Imports
          </div>
          <div className="mt-2 text-2xl font-semibold">{kpis.active}</div>
        </div>
        <div className="border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Icon name="ShieldAlert" size={16} /> Pending QC
          </div>
          <div className="mt-2 text-2xl font-semibold">{kpis.pendingQC}</div>
        </div>
        <div className="border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Icon name="BadgeCheck" size={16} /> In Warehouse
          </div>
          <div className="mt-2 text-2xl font-semibold">{kpis.inWarehouse}</div>
        </div>
        <div className="border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Icon name="DollarSign" size={16} /> Total Import Value (CLP)
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 })
              .format(kpis.totalClp)}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="border border-border rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-muted-foreground">Transport Type</label>
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              value={filters.transport}
              onChange={(e) => setFilters((f) => ({ ...f, transport: e.target.value }))}>
              <option value="">All</option>
              <option value="air">Air</option>
              <option value="sea">Sea</option>
              <option value="land">Land</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">QC Status</label>
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              value={filters.qc}
              onChange={(e) => setFilters((f) => ({ ...f, qc: e.target.value }))}>
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In-Progress</option>
              <option value="approved">Approved</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Import Status</label>
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              value={filters.imp}
              onChange={(e) => setFilters((f) => ({ ...f, imp: e.target.value }))}>
              <option value="">All</option>
              <option value="transit">Transit</option>
              <option value="warehouse">Warehouse</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Shipment ID</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Arrival Date</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Transport</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">QC Status</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Import Status</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Total Cost (CLP)</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const qcAgg = qcByShipment[r.id] || "approved";
                const totalClp = r.totalCostClp || totalByShipment[r.id] || 0;
                return (
                  <tr key={r.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 font-medium">{r.id}</td>
                    <td className="px-6 py-4">{r.arrivalDate ? new Date(r.arrivalDate).toLocaleDateString("es-CL") : "—"}</td>
                    <td className="px-6 py-4 capitalize">{r.transportType || "—"}</td>
                    <td className="px-6 py-4"><Badge tone={qcTone(qcAgg)}>{qcAgg || "—"}</Badge></td>
                    <td className="px-6 py-4"><Badge tone={statusTone(r.importStatus)}>{r.importStatus || "—"}</Badge></td>
                    <td className="px-6 py-4">
                      {new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(totalClp)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" iconName="Eye" onClick={() => setSelected(r)}>View Details</Button>
                        <Button variant="ghost" size="sm" iconName="Clock">View Timeline</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td className="px-6 py-8 text-center text-muted-foreground" colSpan={7}>No shipments found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer de detalles */}
      {selected && (
        <ImportDetailsDrawer
          shipment={selected}
          items={importItems.filter((x) => x.shipmentId === selected.id)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
