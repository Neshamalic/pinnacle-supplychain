// src/pages/import-management/index.jsx
import React, { useMemo, useState } from "react";
import { Eye, RefreshCcw, Package, Truck } from "lucide-react";
import Button from "@/components/ui/Button";
import { useSheet } from "@/lib/sheetsApi";
import { mapImports, mapImportItems } from "@/lib/adapters";
import ImportDetailsDrawer from "./components/ImportDetailsDrawer";

// helpers “for dummies”
const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
};
const tone = (t) => ({
  slab: "rounded-xl shadow-sm border",
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
  const x = s.toLowerCase();
  const cls =
    x === "transit" ? tones.amber :
    x === "warehouse" ? tones.slate :
    x === "delivered" || x === "arrived" ? tones.green :
    tones.gray;
  return <span className={`${pill} ${cls}`}>{s || "—"}</span>;
};

export default function ImportManagement() {
  // 1) Leemos “imports” y “import_items”
  const { rows: importsRaw = [], loading, error, reload } = useSheet("imports", mapImports);
  const { rows: importItems = [] } = useSheet("import_items", mapImportItems);

  const [q, setQ] = useState("");
  const [openDrawer, setOpenDrawer] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  // 2) Index de items por OCI/PO (sirve para contar productos y filtrar fantasmas)
  const itemsByOci = useMemo(() => {
    const m = new Map();
    for (const r of importItems) {
      const key = (r.ociNumber || "").trim();
      if (!key) continue;
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(r);
    }
    return m;
  }, [importItems]);

  const itemsByPo = useMemo(() => {
    const m = new Map();
    for (const r of importItems) {
      const key = (r.poNumber || "").trim();
      if (!key) continue;
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(r);
    }
    return m;
  }, [importItems]);

  // 3) Agrupar por shipmentId y descartar “fantasmas”
  const shipments = useMemo(() => {
    const byShip = new Map();

    for (const row of importsRaw) {
      const sid = (row.shipmentId || "").trim();
      const oci = (row.ociNumber || "").trim();
      const po  = (row.poNumber  || "").trim();

      // ¿Tiene al menos un item asociado por OCI o PO?
      const itemCount =
        (oci && itemsByOci.get(oci)?.length) ? itemsByOci.get(oci).length :
        (po  && itemsByPo.get(po)?.length)  ? itemsByPo.get(po).length  : 0;

      // Si no hay items y tampoco OCI/PO, lo consideramos “fantasma” y lo omitimos
      if (!itemCount && !oci && !po) continue;

      if (!byShip.has(sid)) {
        byShip.set(sid, {
          id: sid || oci || po || "—",
          shipmentId: sid,
          transportType: row.transportType || "",
          importStatus: row.importStatus || "",
          eta: row.eta || "",
          productCount: itemCount,
        });
      } else {
        // Merge simple: conservar primer valor y completar campos vacíos
        const agg = byShip.get(sid);
        agg.transportType ||= row.transportType || "";
        agg.importStatus ||= row.importStatus || "";
        agg.eta ||= row.eta || "";
        // si en otra fila de mismo shipment encontramos más items, sumar máximo
        agg.productCount = Math.max(agg.productCount, itemCount);
      }
    }

    // Buscar texto
    let list = Array.from(byShip.values());
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter(r => (r.shipmentId || "").toLowerCase().includes(s));
    }
    // Ordenar por shipmentId
    list.sort((a,b) => (a.shipmentId || "").localeCompare(b.shipmentId || ""));
    return list;
  }, [importsRaw, itemsByOci, itemsByPo, q]);

  // 4) Métricas (cards)
  const metrics = useMemo(() => {
    const total = shipments.length;
    const transit = shipments.filter(r => (r.importStatus || "").toLowerCase() === "transit").length;
    const warehouse = shipments.filter(r => (r.importStatus || "").toLowerCase() === "warehouse").length;
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

      {/* KPI cards grandes y con color */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard
          icon={<Package size={20} />}
          label="Total Shipments"
          value={metrics.total}
          className="bg-indigo-50 text-indigo-700 border-indigo-200"
        />
        <KpiCard
          icon={<Truck size={20} />}
          label="In Transit"
          value={metrics.transit}
          className="bg-amber-50 text-amber-700 border-amber-200"
        />
        <KpiCard
          icon={<Truck size={20} />}
          label="Warehouse"
          value={metrics.warehouse}
          className="bg-slate-50 text-slate-700 border-slate-200"
        />
      </div>

      {/* Buscador */}
      <div className="mb-4">
        <div className="relative">
          <input
            className="w-full rounded-lg border px-10 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            placeholder="Search shipments by Shipment ID..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <SearchIcon />
        </div>
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
            {loading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {error && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-red-600">Error: {String(error)}</td></tr>
            )}
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

      {/* Drawer de detalles */}
      {openDrawer && (
        <ImportDetailsDrawer
          open
          onClose={() => setOpenDrawer(false)}
          importRow={selectedRow}
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
function SearchIcon() {
  return <RefreshCcw className="hidden" />; // sólo para evitar tree-shaking de lucide; el real icono lo hacemos con CSS:
}

/* KPI card */
function KpiCard({ icon, label, value, className = "" }) {
  const base = "rounded-xl border p-4 flex items-center gap-3";
  return (
    <div className={`${base} ${className}`}>
      <div className="p-2 rounded-lg bg-white/70">{icon}</div>
      <div>
        <div className="text-sm opacity-80">{label}</div>
        <div className="text-2xl font-semibold">{value}</div>
      </div>
    </div>
  );
}
