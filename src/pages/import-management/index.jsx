// src/pages/import-management/index.jsx
import React, { useMemo, useState } from "react";
import Icon from "@/components/AppIcon";
import Button from "@/components/ui/Button";
import { useSheet } from "@/lib/sheetsApi";
import { mapImports, mapImportItems, _utils } from "@/lib/adapters";

const { toNumber } = _utils;

const fmtMoney = (v, curr = "CLP", locale = "es-CL") =>
  new Intl.NumberFormat(locale, { style: "currency", currency: curr, maximumFractionDigits: 0 }).format(
    Number.isFinite(+v) ? +v : 0
  );

const fmtDate = (iso, locale = "es-CL") => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
};

const statusBadge = (value) => {
  const v = (value || "").toLowerCase();
  const cls =
    v === "pending" || v === "awaiting"
      ? "bg-yellow-100 text-yellow-800"
      : v === "in customs" || v === "customs"
      ? "bg-purple-100 text-purple-800"
      : v === "passed" || v === "cleared" || v === "completed"
      ? "bg-green-100 text-green-800"
      : "bg-muted text-foreground";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{value || "—"}</span>;
};

export default function ImportManagement() {
  // filtros UI
  const [search, setSearch] = useState("");
  const [fTransport, setFTransport] = useState("");
  const [fQc, setFQc] = useState("");
  const [fCustoms, setFCustoms] = useState("");

  // datos desde Google Sheets
  const { rows: importsRows = [], loading: loadingI, error: errorI } = useSheet("imports", mapImports);
  const { rows: itemsRows = [], loading: loadingIt, error: errorIt } = useSheet("import_items", mapImportItems);

  // índice items por oci
  const itemsByOci = useMemo(() => {
    const map = new Map();
    for (const it of itemsRows || []) {
      const key = it.ociNumber || "";
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }
    return map;
  }, [itemsRows]);

  // costo CLP por OCI (fallback a suma de items CLP)
  const withTotals = useMemo(() => {
    return (importsRows || []).map((imp) => {
      let totalClp = toNumber(imp.totalCostClp);
      if (!totalClp) {
        const arr = itemsByOci.get(imp.ociNumber) || [];
        totalClp = arr
          .filter((x) => (x.currency || "").toUpperCase() === "CLP")
          .reduce((acc, x) => acc + toNumber(x.qty) * toNumber(x.unitPrice), 0);
      }
      return { ...imp, totalCostClp: totalClp };
    });
  }, [importsRows, itemsByOci]);

  // filtros
  const filtered = useMemo(() => {
    const s = (search || "").toLowerCase();
    return (withTotals || []).filter((r) => {
      if (s) {
        const hay =
          (r.ociNumber || "").toLowerCase().includes(s) ||
          (r.origin || "").toLowerCase().includes(s) ||
          (r.destination || "").toLowerCase().includes(s) ||
          (r.location || "").toLowerCase().includes(s);
        if (!hay) return false;
      }
      if (fTransport && r.transportType !== fTransport) return false;
      if (fQc && r.qcStatus !== fQc) return false;
      if (fCustoms && r.customsStatus !== fCustoms) return false;
      return true;
    });
  }, [withTotals, search, fTransport, fQc, fCustoms]);

  // métricas
  const metrics = useMemo(() => {
    const active = (withTotals || []).length;
    const pendingQc = (withTotals || []).filter((x) => ["pending", "awaiting", "to qc"].includes(x.qcStatus)).length;
    const inCustoms = (withTotals || []).filter((x) => ["in customs", "customs", "clearance"].includes(x.customsStatus)).length;
    const totalClp = (withTotals || []).reduce((acc, x) => acc + toNumber(x.totalCostClp), 0);
    return { active, pendingQc, inCustoms, totalClp };
  }, [withTotals]);

  const unique = (arr) => Array.from(new Set(arr.filter(Boolean)));

  const transportOptions = unique((withTotals || []).map((x) => x.transportType));
  const qcOptions = unique((withTotals || []).map((x) => x.qcStatus));
  const customsOptions = unique((withTotals || []).map((x) => x.customsStatus));

  return (
    <div className="px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <nav className="text-sm text-muted-foreground mb-1">
            <span>Dashboard</span> <span className="mx-1">›</span> <span className="text-foreground">Import Management</span>
          </nav>
          <h1 className="text-2xl font-semibold text-foreground">Import Management</h1>
          <p className="text-sm text-muted-foreground">Track incoming shipments from arrival through quality control completion</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" iconName="Download">Export Data</Button>
          <Button variant="default" iconName="RefreshCcw">Refresh Data</Button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <CardStat title="Active Imports" value={metrics.active} trend="+12%" icon="Package" />
        <CardStat title="Pending QC" value={metrics.pendingQc} trend="-5%" icon="Shield" />
        <CardStat title="Customs Clearance" value={metrics.inCustoms} trend="+8%" icon="FileSearch" />
        <CardStat title="Total Import Value" value={fmtMoney(metrics.totalClp, "CLP")} trend="+15%" icon="DollarSign" />
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg border border-border p-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 relative">
            <Icon name="Search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shipments…"
              className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 ring-ring"
            />
          </div>
          <Button variant="ghost" onClick={() => { setSearch(""); setFTransport(""); setFQc(""); setFCustoms(""); }}>
            Reset Filters
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Select value={fTransport} onChange={setFTransport} label="Transport Type" options={transportOptions} placeholder="Select an option" />
          <Select value={fQc} onChange={setFQc} label="QC Status" options={qcOptions} placeholder="Select an option" />
          <Select value={fCustoms} onChange={setFCustoms} label="Customs Status" options={customsOptions} placeholder="Select an option" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <Th>Shipment ID</Th>
                <Th>Arrival Date</Th>
                <Th>Transport</Th>
                <Th>QC Status</Th>
                <Th>Customs</Th>
                <Th className="text-right">Total Cost</Th>
                <Th>Location</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(loadingI || loadingIt) && (
                <tr><td colSpan={7} className="px-6 py-6 text-sm text-muted-foreground">Loading imports…</td></tr>
              )}
              {(errorI || errorIt) && (
                <tr><td colSpan={7} className="px-6 py-6 text-sm text-red-600">Error: {String(errorI || errorIt)}</td></tr>
              )}
              {!loadingI && !loadingIt && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-muted-foreground text-sm">No shipments found.</td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id || r.ociNumber}>
                  <Td>{r.ociNumber || "—"}</Td>
                  <Td>{fmtDate(r.eta)}</Td>
                  <Td className="capitalize">{r.transportType || "—"}</Td>
                  <Td>{statusBadge(r.qcStatus)}</Td>
                  <Td>{statusBadge(r.customsStatus)}</Td>
                  <Td className="text-right font-medium">{fmtMoney(r.totalCostClp || 0, "CLP")}</Td>
                  <Td>{r.location || r.destination || "—"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------- Pequeños componentes UI ---------- */
const CardStat = ({ title, value, trend, icon }) => (
  <div className="bg-card rounded-lg border border-border p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-md bg-muted">
          <Icon name={icon} size={18} />
        </div>
        <span className="text-sm text-muted-foreground">{title}</span>
      </div>
      <span className="text-xs text-emerald-600">{trend}</span>
    </div>
    <div className="mt-2 text-xl font-semibold text-foreground">{value}</div>
    <div className="text-xs text-muted-foreground">Combined import value</div>
  </div>
);

const Select = ({ value, onChange, label, options = [], placeholder }) => (
  <div>
    <label className="block text-xs text-muted-foreground mb-1">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 ring-ring capitalize"
    >
      <option value="">{placeholder || "All"}</option>
      {options.map((op) => (
        <option key={op} value={op} className="capitalize">
          {op || "—"}
        </option>
      ))}
    </select>
  </div>
);

const Th = ({ children, className = "" }) => (
  <th className={`px-6 py-3 text-left text-xs font-medium text-muted-foreground ${className}`}>{children}</th>
);
const Td = ({ children, className = "" }) => (
  <td className={`px-6 py-4 text-sm text-foreground ${className}`}>{children}</td>
);
