// src/pages/import-management/index.jsx
import React, { useMemo, useState } from "react";
import Icon from "@/components/AppIcon";
import Button from "@/components/ui/Button";

import { useSheet } from "@/lib/sheetsApi";
import { mapImports, mapImportItems, _utils } from "@/lib/adapters";
const { toNumber } = _utils;

const fmtMoneyUSD = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(toNumber(n));

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
};

const StatusPill = ({ value }) => {
  const v = (value || "").toLowerCase();
  const styles =
    v === "warehouse"
      ? "bg-emerald-100 text-emerald-700"
      : v === "transit"
      ? "bg-amber-100 text-amber-700"
      : "bg-muted text-muted-foreground";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}>{value || "—"}</span>;
};

const QCBadge = ({ value }) => {
  const v = (value || "").toLowerCase();
  const styles =
    v === "approved"
      ? "bg-emerald-100 text-emerald-700"
      : v === "in-progress"
      ? "bg-sky-100 text-sky-700"
      : v === "pending"
      ? "bg-amber-100 text-amber-700"
      : v === "rejected"
      ? "bg-rose-100 text-rose-700"
      : "bg-muted text-muted-foreground";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${styles}`}>{value || "—"}</span>;
};

const DetailsModal = ({ open, onClose, shipment }) => {
  if (!open || !shipment) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card w-full max-w-3xl rounded-lg shadow-modal border border-border overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Import Details</h3>
            <p className="text-sm text-muted-foreground mt-1">Shipment ID: {shipment.shipmentId}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <Icon name="X" size={18} />
          </Button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Info label="Arrival Date" value={fmtDate(shipment.arrivalDate)} />
            <Info label="Transport" value={shipment.transportType || "—"} />
            <Info label="Import Status" value={<StatusPill value={shipment.importStatus} />} />
            <Info label="CIF Cost (USD)" value={fmtMoneyUSD(shipment.cifUsd)} />
          </div>

          <div className="mt-2">
            <h4 className="text-sm font-medium text-foreground mb-2">Items & Lots</h4>
            {shipment.items.length === 0 ? (
              <div className="text-sm text-muted-foreground">No items for this import.</div>
            ) : (
              <div className="space-y-3">
                {shipment.items.map((it, idx) => (
                  <div key={`${it.ociNumber}-${it.presentationCode}-${it.lotNumber}-${idx}`} className="border border-border rounded-md p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm">
                        <div className="font-medium text-foreground">{it.presentationCode}</div>
                        <div className="text-muted-foreground">Lot: {it.lotNumber || "—"} · OCI: {it.ociNumber || "—"}</div>
                      </div>
                      <div className="text-sm text-right">
                        <div>Qty: <span className="font-medium">{toNumber(it.qty)}</span></div>
                        <div>Unit: {fmtMoneyUSD(it.unitPrice)}</div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <QCBadge value={it.qcStatus} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-border flex justify-end">
          <Button variant="default" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

const Info = ({ label, value }) => (
  <div>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-sm font-medium text-foreground">{value}</div>
  </div>
);

export default function ImportManagementPage() {
  // IMPORTANTÍSIMO: contenedor normal (NO fixed/inset-0) para que se vea el header global.
  const { rows: importRows = [], loading, error } = useSheet("imports", mapImports);
  const { rows: itemRows = [] } = useSheet("import_items", mapImportItems);

  const [query, setQuery] = useState("");
  const [transport, setTransport] = useState("all");
  const [impStatus, setImpStatus] = useState("all");

  const shipments = useMemo(() => {
    // 1) agrupar imports por shipmentId
    const groups = new Map();
    for (const r of importRows || []) {
      const sid = r.shipmentId || r.ociNumber || r.id;
      if (!sid) continue;
      if (!groups.has(sid)) {
        groups.set(sid, {
          shipmentId: sid,
          transportType: r.transportType || "",
          importStatus: r.importStatus || "",
          arrivalDate: r.eta || "",
          cifUsd: Number(r.totalCostUsd || 0), // opcional, luego sumamos items
          ociNumbers: new Set(),
          items: [],
        });
      }
      const g = groups.get(sid);
      g.ociNumbers.add(r.ociNumber);
      // priorizamos "transit" si hay mezcla
      if (r.importStatus === "transit") g.importStatus = "transit";
      if (!g.transportType && r.transportType) g.transportType = r.transportType;
      // llegada más temprana
      if (r.eta && (!g.arrivalDate || new Date(r.eta) < new Date(g.arrivalDate))) g.arrivalDate = r.eta;
    }

    // 2) anexar items por OCI y sumar CIF en USD
    const list = Array.from(groups.values());
    for (const it of itemRows || []) {
      for (const group of list) {
        if (group.ociNumbers.has(it.ociNumber)) {
          group.items.push(it);
          if (!it.currency || it.currency === "USD") {
            group.cifUsd += toNumber(it.qty) * toNumber(it.unitPrice);
          }
        }
      }
    }

    // 3) filtros
    let arr = list;
    if (query) {
      const q = query.toLowerCase();
      arr = arr.filter(
        (g) =>
          g.shipmentId.toLowerCase().includes(q) ||
          Array.from(g.ociNumbers).some((o) => String(o || "").toLowerCase().includes(q))
      );
    }
    if (transport !== "all") arr = arr.filter((g) => (g.transportType || "") === transport);
    if (impStatus !== "all") arr = arr.filter((g) => (g.importStatus || "") === impStatus);

    // orden por arrivalDate desc
    arr.sort((a, b) => (new Date(b.arrivalDate || 0).getTime() - new Date(a.arrivalDate || 0).getTime()));
    return arr;
  }, [importRows, itemRows, query, transport, impStatus]);

  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const openDetails = (s) => { setCurrent(s); setOpen(true); };

  return (
    <div className="px-6 py-6">
      {/* Header (en flujo normal para no tapar la barra global) */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center text-sm text-muted-foreground space-x-2">
            <Icon name="Home" size={14} />
            <span>Dashboard</span>
            <Icon name="ChevronRight" size={14} />
            <span className="text-foreground">Import Management</span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground mt-1">Import Management</h1>
          <p className="text-sm text-muted-foreground">
            Track incoming shipments from arrival through quality control completion.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" iconName="Download">Export Data</Button>
          <Button variant="default" iconName="RefreshCcw">Refresh Data</Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-card rounded-lg border border-border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground">Search shipments…</label>
            <input
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 ring-ring"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Shipment ID or OCI…"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Transport Type</label>
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 ring-ring"
              value={transport}
              onChange={(e) => setTransport(e.target.value)}
            >
              <option value="all">All</option>
              <option value="air">air</option>
              <option value="sea">sea</option>
              <option value="land">land</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Import Status</label>
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 ring-ring"
              value={impStatus}
              onChange={(e) => setImpStatus(e.target.value)}
            >
              <option value="all">All</option>
              <option value="transit">transit</option>
              <option value="warehouse">warehouse</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Shipment ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Arrival Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Transport</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Import Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">CIF Cost (USD)</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr><td colSpan={6} className="px-6 py-6 text-sm">Loading…</td></tr>
              )}
              {error && (
                <tr><td colSpan={6} className="px-6 py-6 text-sm text-red-600">Error: {String(error)}</td></tr>
              )}
              {!loading && !error && shipments.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-6 text-sm text-muted-foreground">No shipments found.</td></tr>
              )}
              {!loading && !error && shipments.map((s) => (
                <tr key={s.shipmentId}>
                  <td className="px-6 py-4 font-medium text-foreground">{s.shipmentId}</td>
                  <td className="px-6 py-4">{fmtDate(s.arrivalDate)}</td>
                  <td className="px-6 py-4 capitalize">{s.transportType || "—"}</td>
                  <td className="px-6 py-4"><StatusPill value={s.importStatus} /></td>
                  <td className="px-6 py-4 font-medium text-foreground">{fmtMoneyUSD(s.cifUsd)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="Eye"
                        onClick={() => openDetails(s)}
                      >
                        View Details
                      </Button>
                      {/* la timeline seguiría como acción aparte si la necesitas */}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DetailsModal open={open} shipment={current} onClose={() => setOpen(false)} />
    </div>
  );
}
