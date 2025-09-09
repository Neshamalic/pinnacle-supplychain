// src/pages/import-management/index.jsx
import React, { useMemo, useState } from "react";
import Icon from "@/components/AppIcon";
import Button from "@/components/ui/Button";
import { useSheet } from "@/lib/sheetsApi";
import { mapImports } from "@/lib/adapters";
import ImportDetailsModal from "./components/ImportDetailsModal";

// ⚠️ Usa el MISMO wrapper/layout que usas en Tenders/Orders para que salga la barra superior.
// Si ya usas un AppShell global en App.jsx no hace falta envolver aquí.
import PageHeader from "@/components/PageHeader"; // mismo header que usas en Tenders

const fmtClp = (n) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(
    Number.isFinite(+n) ? +n : 0
  );

const Badge = ({ children, tone = "muted" }) => {
  const color =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : tone === "warning"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : tone === "danger"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-muted text-foreground/70 border-transparent";
  return <span className={`px-2 py-0.5 rounded-full text-xs border ${color}`}>{children}</span>;
};

const toneFrom = (v) => {
  switch ((v || "").toLowerCase()) {
    case "approved":
    case "cleared":
      return "success";
    case "in customs":
    case "pending":
    case "in progress":
      return "warning";
    case "rejected":
    case "hold":
      return "danger";
    default:
      return "muted";
  }
};

export default function ImportManagement() {
  const { rows: imports = [], loading, error } = useSheet("imports", mapImports);

  // filtros simples (puedes ampliarlos)
  const [transport, setTransport] = useState("all");
  const [qc, setQc] = useState("all");
  const [customs, setCustoms] = useState("all");
  const [q, setQ] = useState("");

  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);

  const list = useMemo(() => {
    let arr = imports || [];
    if (q) {
      const s = q.toLowerCase();
      arr = arr.filter(
        (r) =>
          String(r.ociNumber).toLowerCase().includes(s) ||
          String(r.location || "").toLowerCase().includes(s)
      );
    }
    if (transport !== "all") arr = arr.filter((r) => r.transportType === transport);
    if (qc !== "all") arr = arr.filter((r) => r.qcStatus === qc);
    if (customs !== "all") arr = arr.filter((r) => r.customs === customs);
    return arr;
  }, [imports, q, transport, qc, customs]);

  const totals = useMemo(() => {
    const totalClp = (list || []).reduce((acc, r) => acc + (r.totalCostClp || 0), 0);
    const pendingQc = (list || []).filter((r) => r.qcStatus === "pending").length;
    const inCustoms = (list || []).filter((r) => r.customs === "in customs").length;
    return { totalClp, pendingQc, inCustoms, active: list.length };
  }, [list]);

  const openDetails = (imp) => {
    setSelected(imp);
    setOpen(true);
  };

  return (
    <div className="w-full">
      {/* Header/breadcrumbs: usa el mismo componente que en Tenders para ver la barra superior */}
      <PageHeader
        title="Import Management"
        breadcrumb={[{ label: "Dashboard", href: "/" }, { label: "Import Management" }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline"><Icon name="Download" className="mr-2" /> Export Data</Button>
            <Button variant="default"><Icon name="RefreshCcw" className="mr-2" /> Refresh Data</Button>
          </div>
        }
      />

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-6">
        <div className="border border-border rounded-xl p-4">
          <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
            <Icon name="Package" /> Active Imports
          </div>
          <div className="text-2xl font-semibold">{totals.active}</div>
        </div>
        <div className="border border-border rounded-xl p-4">
          <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
            <Icon name="Shield" /> Pending QC
          </div>
          <div className="text-2xl font-semibold">{totals.pendingQc}</div>
        </div>
        <div className="border border-border rounded-xl p-4">
          <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
            <Icon name="ClipboardCheck" /> Customs Clearance
          </div>
          <div className="text-2xl font-semibold">{totals.inCustoms}</div>
        </div>
        <div className="border border-border rounded-xl p-4">
          <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
            <Icon name="DollarSign" /> Total Import Value
          </div>
          <div className="text-2xl font-semibold">{fmtClp(totals.totalClp)}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-6 mt-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              placeholder="Search shipments…"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              value={transport}
              onChange={(e) => setTransport(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2"
            >
              <option value="all">All Transports</option>
              <option value="air">Air</option>
              <option value="sea">Sea</option>
              <option value="land">Land</option>
            </select>
            <select value={qc} onChange={(e) => setQc(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2">
              <option value="all">All QC</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="approved">Approved</option>
            </select>
            <select
              value={customs}
              onChange={(e) => setCustoms(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2"
            >
              <option value="all">All Customs</option>
              <option value="in customs">In Customs</option>
              <option value="cleared">Cleared</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="px-6 mt-6">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-sm">Shipment ID</th>
                <th className="px-4 py-3 text-left text-sm">Arrival Date</th>
                <th className="px-4 py-3 text-left text-sm">Transport</th>
                <th className="px-4 py-3 text-left text-sm">QC Status</th>
                <th className="px-4 py-3 text-left text-sm">Customs</th>
                <th className="px-4 py-3 text-right text-sm">Total Cost</th>
                <th className="px-4 py-3 text-left text-sm">Location</th>
                <th className="px-4 py-3 text-left text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-red-600">
                    Error: {String(error)}
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                list.map((r) => (
                  <tr key={r.id || r.ociNumber}>
                    <td className="px-4 py-3 font-medium">{r.ociNumber || "—"}</td>
                    <td className="px-4 py-3">
                      {r.arrivalDate ? new Date(r.arrivalDate).toLocaleDateString("es-CL") : "—"}
                    </td>
                    <td className="px-4 py-3 capitalize">{r.transportType || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge tone={toneFrom(r.qcStatus)}>{r.qcStatus || "—"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={toneFrom(r.customs)}>{r.customs || "—"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">{fmtClp(r.totalCostClp)}</td>
                    <td className="px-4 py-3">{r.location || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openDetails(r)}>
                          <Icon name="Eye" className="mr-2" /> View Details
                        </Button>
                        {/* Si tienes timeline, aquí otro botón */}
                      </div>
                    </td>
                  </tr>
                ))}
              {!loading && !error && list.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    No imports found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal detalles */}
      <ImportDetailsModal imp={selected} isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
}

