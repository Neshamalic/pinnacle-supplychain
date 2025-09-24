// src/pages/import-management/index.jsx
import React, { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import { useSheet } from "@/lib/sheetsApi";
import { mapImports, mapImportItems } from "@/lib/adapters";
import ImportDetailsDrawer from "./components/ImportDetailsDrawer.jsx";

const Badge = ({ children }) => (
  <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
    {children || "—"}
  </span>
);

export default function ImportManagementPage() {
  // Fuente de verdad: SOLO "imports"
  const { rows: imports = [], loading, error, refetch, refresh } = useSheet("imports", mapImports);
  // Usamos import_items solo para contar productos
  const { rows: importItems = [] } = useSheet("import_items", mapImportItems);

  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);

  const doRefresh = async () => {
    if (typeof refetch === "function") await refetch();
    else if (typeof refresh === "function") await refresh();
  };

  // Conteo de productos únicos por shipment (desde import_items, pero NO crea filas)
  const productCountByShipment = useMemo(() => {
    const map = new Map();
    for (const it of importItems || []) {
      const sid = it.shipmentId;
      if (!sid) continue;
      if (!map.has(sid)) map.set(sid, new Set());
      const key = it.presentationCode || it.productName || it.lotNumber;
      if (key) map.get(sid).add(String(key));
    }
    const out = {};
    for (const [sid, set] of map.entries()) out[sid] = set.size;
    return out;
  }, [importItems]);

  // Agrupar por shipmentId (único renglón)
  const grouped = useMemo(() => {
    const byId = new Map();
    for (const r of imports || []) {
      const sid = r.shipmentId?.trim();
      if (!sid) continue;
      if (!byId.has(sid)) byId.set(sid, []);
      byId.get(sid).push(r);
    }
    const merged = [];
    for (const [sid, arr] of byId.entries()) {
      // escoger el primer valor no vacío por campo
      const merge = (k) => arr.find((x) => x?.[k])?.[k] ?? "";
      merged.push({
        shipmentId: sid,
        transportType: merge("transportType"),
        importStatus: merge("importStatus"),
        eta: merge("eta"),
        productCount: productCountByShipment[sid] ?? 0,
      });
    }
    // búsqueda
    const s = q.toLowerCase().trim();
    const filtered = s
      ? merged.filter((r) =>
          [r.shipmentId, r.transportType, r.importStatus].some((x) =>
            String(x || "").toLowerCase().includes(s)
          )
        )
      : merged;
    // ordenar por Shipment ID
    filtered.sort((a, b) => String(a.shipmentId).localeCompare(String(b.shipmentId)));
    return filtered;
  }, [imports, q, productCountByShipment]);

  // KPIs simples
  const total = grouped.length;
  const inTransit = grouped.filter((r) => (r.importStatus || "").toLowerCase().includes("transit")).length;
  const warehouse = grouped.filter((r) => (r.importStatus || "").toLowerCase().includes("warehouse")).length;
  const delivered = 0; // si lo manejas, se puede derivar de otro campo

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
          placeholder="Search shipments by Shipment ID…"
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
              <th className="px-4 py-3 font-medium">Products</th>
              <th className="px-4 py-3 font-medium">Transport</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((r) => (
              <tr key={String(r.shipmentId)} className="border-t">
                <td className="px-4 py-3">{r.shipmentId || "—"}</td>
                <td className="px-4 py-3">{r.productCount ?? 0}</td>
                <td className="px-4 py-3"><Badge>{r.transportType}</Badge></td>
                <td className="px-4 py-3"><Badge>{r.importStatus}</Badge></td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="secondary" onClick={() => setSelected(r)}>
                    <Icon name="Eye" className="mr-2" />
                    View Details
                  </Button>
                </td>
              </tr>
            ))}
            {grouped.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-muted-foreground" colSpan={5}>
                  No shipments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
        <div className="text-lg font-semibold">{value ?? 0}</div>
      </div>
    </div>
  );
}
