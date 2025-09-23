// src/pages/import-management/index.jsx
import React, { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import { useSheet } from "@/lib/sheetsApi";
import { mapImports, mapImportItems } from "@/lib/adapters";
import ImportDetailsDrawer from "./components/ImportDetailsDrawer.jsx";

/* ---------- pequeños helpers UI ---------- */
const Badge = ({ children }) => (
  <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
    {children || "—"}
  </span>
);
const StatCard = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm">
    <Icon name={icon} />
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value ?? 0}</div>
    </div>
  </div>
);

/* ---------- lógica de agrupación ---------- */
/** Elige el primer valor no vacío entre posibles aliases de campo. */
function prefer(row, ...keys) {
  for (const k of keys) {
    const v = row?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
}

/** Une N filas de `imports` con el mismo shipmentId, escogiendo valores no vacíos. */
function mergeImportRows(rows) {
  // Orden simple: filas con más campos no vacíos primero
  const fullness = (r) =>
    ["transportType", "transport_type", "importStatus", "status", "eta", "arrivalDate", "qcStatus", "qc_status", "customsStatus", "customs_status", "location", "destination"].reduce(
      (acc, k) => acc + (r?.[k] ? 1 : 0),
      0
    );
  const sorted = [...rows].sort((a, b) => fullness(b) - fullness(a));

  // Tomamos la "mejor" fila como base y rellenamos con las demás si falta algo
  const base = { ...(sorted[0] || {}) };
  for (const r of sorted.slice(1)) {
    for (const k of Object.keys(r || {})) {
      if (base[k] === undefined || base[k] === null || String(base[k]).trim() === "") {
        base[k] = r[k];
      }
    }
  }

  // Normalizamos los nombres que usará la UI
  return {
    shipmentId: prefer(base, "shipmentId", "shipment_id"),
    transportType: prefer(base, "transportType", "transport_type"),
    importStatus: prefer(base, "importStatus", "status"),
    eta: prefer(base, "eta", "arrivalDate"),
    qcStatus: prefer(base, "qcStatus", "qc_status"),
    customsStatus: prefer(base, "customsStatus", "customs_status"),
    location: prefer(base, "location", "destination"),
  };
}

export default function ImportManagementPage() {
  // Leemos SIEMPRE desde `imports` (la fuente de verdad)
  const { rows: importRows = [], loading, error, refetch, refresh } = useSheet(
    "imports",
    mapImports
  );

  // Leemos `import_items` SOLO para contar productos por shipment
  const { rows: importItems = [] } = useSheet("import_items", mapImportItems);

  const doRefresh = async () => {
    if (typeof refetch === "function") await refetch();
    else if (typeof refresh === "function") await refresh();
  };

  // Agrupamos por shipmentId usando SOLO `imports`
  const groupedShipments = useMemo(() => {
    const byId = new Map();
    for (const r of importRows) {
      const sid = prefer(r, "shipmentId", "shipment_id");
      if (!sid) continue;
      if (!byId.has(sid)) byId.set(sid, []);
      byId.get(sid).push(r);
    }

    // Conteo de productos por shipment (unique presentation_code en import_items)
    const productSets = new Map();
    for (const it of importItems) {
      const sid = prefer(it, "shipmentId", "shipment_id");
      if (!sid) continue; // solo contamos, no generamos shipments fantasma
      const code =
        prefer(it, "presentationCode", "presentation_code", "productCode", "product_code") ||
        `${prefer(it, "productName", "product_name")}`;
      if (!productSets.has(sid)) productSets.set(sid, new Set());
      if (code) productSets.get(sid).add(String(code));
    }

    const result = [];
    for (const [sid, rows] of byId.entries()) {
      const merged = mergeImportRows(rows);
      result.push({
        ...merged,
        productCount: productSets.get(sid)?.size || 0,
      });
    }

    // Orden por Shipment ID (o podrías ordenar por ETA si prefieres)
    result.sort((a, b) => String(a.shipmentId).localeCompare(String(b.shipmentId)));
    return result;
  }, [importRows, importItems]);

  // Búsqueda
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = (q || "").toLowerCase().trim();
    if (!s) return groupedShipments;
    return groupedShipments.filter((r) =>
      [r.shipmentId, r.transportType, r.importStatus, r.location]
        .map((x) => String(x || "").toLowerCase())
        .some((x) => x.includes(s))
    );
  }, [groupedShipments, q]);

  // Stats (sobre la lista agrupada)
  const total = filtered.length;
  const inTransit = filtered.filter((r) =>
    String(r.importStatus || "").toLowerCase().includes("transit")
  ).length;
  const warehouse = filtered.filter((r) =>
    String(r.importStatus || "").toLowerCase().includes("warehouse")
  ).length;
  const delivered = filtered.filter((r) =>
    String(r.importStatus || "").toLowerCase().includes("delivered")
  ).length;

  const [selected, setSelected] = useState(null);

  return (
    <div className="p-6">
      <div className="mb-1 text-2xl font-semibold">Import Management</div>
      <p className="mb-4 text-gray-600">
        Track incoming shipments from suppliers and customs status.
      </p>

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

      {loading && (
        <div className="text-sm text-muted-foreground">Loading imports…</div>
      )}
      {error && <div className="text-sm text-rose-600">Error: {String(error)}</div>}

      {/* Tabla agrupada por Shipment */}
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
            {filtered.map((r) => (
              <tr key={String(r.shipmentId)} className="border-t">
                <td className="px-4 py-3">{r.shipmentId || "—"}</td>
                <td className="px-4 py-3">{r.productCount ?? 0}</td>
                <td className="px-4 py-3">
                  <Badge>{r.transportType}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge>{r.importStatus}</Badge>
                </td>
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
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-muted-foreground" colSpan={5}>
                  No shipments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer (usa el row agrupado/mergeado) */}
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
