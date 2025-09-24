// src/pages/import-management/index.jsx
import React, { useMemo, useState } from "react";
import { Eye, Package, Truck } from "lucide-react";
import Button from "@/components/ui/Button";
import { useSheet } from "@/lib/sheetsApi";
import { mapImports, mapImportItems } from "@/lib/adapters";
import ImportDetailsDrawer from "./components/ImportDetailsDrawer";

const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
};

// Normaliza valores de estado que vienen distintos (wharehouse/cleared/in customs…)
const normalizeStatus = (s = "") => {
  const v = s.toLowerCase().trim();
  if (v === "wharehouse") return "warehouse";
  if (v === "cleared") return "warehouse";
  if (v === "in customs") return "transit";
  return v;
};

const tone = () => ({
  pill: "inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium",
  tones: {
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-green-100 text-green-700",
    slate: "bg-slate-100 text-slate-700",
    gray: "bg-gray-100 text-gray-700",
  },
});
const pillTransport = (s = "") => {
  const { pill, tones } = tone();
  const x = s.toLowerCase();
  const cls = x === "air" ? tones.blue : x === "sea" ? tones.slate : tones.gray;
  return <span className={`${pill} ${cls}`}>{s || "—"}</span>;
};
const pillStatus = (s = "") => {
  const { pill, tones } = tone();
  const x = normalizeStatus(s);
  const cls =
    x === "transit" ? tones.amber :
    x === "warehouse" ? tones.slate :
    x === "delivered" || x === "arrived" ? tones.green :
    tones.gray;
  return <span className={`${pill} ${cls}`}>{x || "—"}</span>;
};

export default function ImportManagement() {
  const { rows: importsRaw = [], loading, error, reload } = useSheet("imports", mapImports);
  const { rows: importItems = [] } = useSheet("import_items", mapImportItems);

  const [q, setQ] = useState("");
  const [openDrawer, setOpenDrawer] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  // Índices por OCI/PO para contar productos
  const itemsByOci = useMemo(() => {
    const m = new Map();
    for (const r of importItems) {
      const k = (r.ociNumber || "").trim();
      if (!k) continue;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(r);
    }
    return m;
  }, [importItems]);

  const itemsByPo = useMemo(() => {
    const m = new Map();
    for (const r of importItems) {
      const k = (r.poNumber || "").trim();
      if (!k) continue;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(r);
    }
    return m;
  }, [importItems]);

  // Agrupar por shipmentId (y pasar ocis/pos al Drawer)
  const shipments = useMemo(() => {
    const byShip = new Map();

    for (const row of importsRaw) {
      const sid = (row.shipmentId || "").trim();
      if (!sid) continue;

      const oci = (row.ociNumber || "").trim();
      const po  = (row.poNumber  || "").trim();

      if (!byShip.has(sid)) {
        byShip.set(sid, {
          id: sid,
          shipmentId: sid,
          transportType: row.transportType || "",
          importStatus: normalizeStatus(row.importStatus || ""),
          eta: row.eta || "",
          ocis: new Set(),
          pos: new Set(),
          productCount: 0,
        });
      }

      const agg = byShip.get(sid);
      if (oci) agg.ocis.add(oci);
      if (po)  agg.pos.add(po);

      // completar info si falta (normalizando status)
      if (!agg.transportType && row.transportType) agg.transportType = row.transportType;
      if (!agg.importStatus && row.importStatus)   agg.importStatus = normalizeStatus(row.importStatus);
      if (!agg.eta && row.eta)                     agg.eta = row.eta;
    }

    // Calcular productCount (sin duplicar oci+po)
    for (const agg of byShip.values()) {
      const uniq = new Set();
      for (const oci of agg.ocis) {
        for (const it of itemsByOci.get(oci) || []) {
          uniq.add(`${it.ociNumber}|${it.poNumber}|${it.presentationCode}|${it.lotNumber}`);
        }
      }
      for (const po of agg.pos) {
        for (const it of itemsByPo.get(po) || []) {
          uniq.add(`${it.ociNumber}|${it.poNumber}|${it.presentationCode}|${it.lotNumber}`);
        }
      }
      agg.productCount = uniq.size;
    }

    let list = Array.from(byShip.values()).map((r) => ({
      ...r,
      ocis: Array.from(r.ocis),
      pos: Array.from(r.pos),
    }));

    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter(r => (r.shipmentId || "").toLowerCase().includes(s));
    }

    // ⛳️ Quitar shipments “fantasma” (sin ítems)
    list = list.filter(r => r.productCount > 0);

    list.sort((a,b) => (a.shipmentId || "").localeCompare(b.shipmentId || ""));
    return list;
  }, [importsRaw, itemsByOci, itemsByPo, q]);

  // KPIs usando status normalizado y lista filtrada
  const metrics = useMemo(() => {
    const total = shipments.length;
    const transit = shipments.filter(r => normalizeStatus(r.importStatus) === "transit").length;
    const warehouse = shipments.filter(r => normalizeStatus(r.importStatus) === "warehouse").length;
    return { total, transit, warehouse };
  }, [shipments]);

  const openDetails = (row) => {
    setSelectedRow(row);
    setOpenDrawer(true);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Import Management</h1>
        <Button variant="secondary" onClick={reload} iconName="RefreshCcw">
          <span className="hidden sm:inline">Refresh Data</span>
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard icon={<Package size={20} />} label="Total Shipments" value={metrics.total}
                 className="bg-indigo-50 text-indigo-700 border-indigo-200" />
        <KpiCard icon={<Truck size={20} />} label="In Transit" value={metrics.transit}
                 className="bg-amber-50 text-amber-700 border-amber-200" />
        <KpiCard icon={<Truck size={20} />} label="Warehouse" value={metrics.warehouse}
                 className="bg-slate-50 text-slate-700 border-slate-200" />
      </div>

      {/* Buscador */}
      <div className="mb-4">
        <input
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          placeholder="Search shipments by Shipment ID..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Tabla */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <Th>Shipment ID</Th>
              <Th>Products</Th>
              <Th>Transport</Th>
              <Th>Status</Th>
              <Th>ETA</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
            {error && <tr><td colSpan={6} className="px-4 py-8 text-center text-red-600">Error: {String(error)}</td></tr>}
            {!loading && !error && shipments.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No imports found.</td></tr>
            )}

            {shipments.map((r) => (
              <tr key={r.id}>
                <Td>{r.shipmentId || "—"}</Td>
                <Td>{r.productCount ?? 0}</Td>
                <Td>{pillTransport(r.transportType)}</Td>
                <Td>{pillStatus(r.importStatus)}</Td>
                <Td>{fmtDate(r.eta)}</Td>
                <Td>
                  <Button size="xs" onClick={() => openDetails(r)}>
                    <Eye size={14} className="mr-1" /> View Details
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openDrawer && (
        <ImportDetailsDrawer
          open
          onClose={() => setOpenDrawer(false)}
          importRow={selectedRow} // trae ocis/pos y estado normalizado
        />
      )}
    </div>
  );
}

function Th({ children }) {
  return <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{children}</th>;
}
function Td({ children }) {
  return <td className="px-4 py-3 text-sm">{children}</td>;
}
function KpiCard({ icon, label, value, className = "" }) {
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${className}`}>
      <div className="p-2 rounded-lg bg-white/70">{icon}</div>
      <div>
        <div className="text-sm opacity-80">{label}</div>
        <div className="text-2xl font-semibold">{value}</div>
      </div>
    </div>
  );
}
