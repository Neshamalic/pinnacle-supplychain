// src/pages/import-management/index.jsx
import React, { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import { useSheet } from "@/lib/sheetsApi";
import { mapImports, mapImportItems } from "@/lib/adapters";
import ImportDetailsDrawer from "./components/ImportDetailsDrawer.jsx";

/* ---- helpers UI ---- */
const cx = (...cls) => cls.filter(Boolean).join(" ");

const Pill = ({ tone = "slate", children }) => {
  const tones = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    sky: "bg-sky-100 text-sky-700 ring-sky-200",
    indigo: "bg-indigo-100 text-indigo-700 ring-indigo-200",
    emerald: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-100 text-amber-800 ring-amber-200",
    rose: "bg-rose-100 text-rose-700 ring-rose-200",
  };
  return (
    <span className={cx(
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1",
      tones[tone] || tones.slate
    )}>
      {children || "—"}
    </span>
  );
};

const StatCard = ({ icon, label, value, tone }) => {
  const tones = {
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-900",
    sky: "bg-sky-50 border-sky-200 text-sky-900",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-900",
  };
  return (
    <div className={cx(
      "flex flex-1 min-w-[240px] items-center gap-3 rounded-2xl border px-5 py-4 shadow-sm",
      tones[tone] || tones.indigo
    )}>
      <div className="rounded-xl bg-white/70 p-2">
        <Icon name={icon} size={20} />
      </div>
      <div>
        <div className="text-xs/5 opacity-80">{label}</div>
        <div className="text-2xl font-semibold">{value ?? 0}</div>
      </div>
    </div>
  );
};

/* ---- helpers datos ---- */
const normId = (v) => String(v || "").trim();
const statusTone = (s) => {
  const t = String(s || "").toLowerCase();
  if (t.includes("warehouse")) return "emerald";
  if (t.includes("transit")) return "amber";
  return "slate";
};
const transportTone = (t) => {
  const v = String(t || "").toLowerCase();
  if (v === "air") return "sky";
  if (v === "sea") return "indigo";
  return "slate";
};

export default function ImportManagementPage() {
  // Fuente de verdad: SOLO 'imports'
  const { rows: imports = [], loading, error, refetch, refresh } = useSheet("imports", mapImports);
  // Usamos import_items sólo para contar productos por shipment (sin crear filas)
  const { rows: itemsA = [] } = useSheet("import_items", mapImportItems);

  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);

  const doRefresh = async () => {
    if (typeof refetch === "function") await refetch();
    else if (typeof refresh === "function") await refresh();
  };

  // Conjunto de productos por shipment (unique presentationCode/productName)
  const productCountByShipment = useMemo(() => {
    const map = new Map();
    for (const it of itemsA) {
      const sid = normId(it.shipmentId);
      if (!sid) continue;
      if (!map.has(sid)) map.set(sid, new Set());
      const key = normId(it.presentationCode || it.productName || it.lotNumber);
      if (key) map.get(sid).add(key);
    }
    const out = {};
    for (const [sid, set] of map.entries()) out[sid] = set.size;
    return out;
  }, [itemsA]);

  // Agrupar por shipmentId usando SOLO lo que existe en imports
  const grouped = useMemo(() => {
    // Dedupe por shipmentId (si hay múltiples filas en imports)
    const byId = new Map();
    for (const r of imports) {
      const sid = normId(r.shipmentId);
      if (!sid) continue;               // si no hay shipmentId, no lo mostramos
      if (!byId.has(sid)) byId.set(sid, []);
      byId.get(sid).push(r);
    }

    const result = [];
    for (const [sid, arr] of byId.entries()) {
      // Escoger primer valor no vacío por campo
      const choose = (k) => arr.find((x) => normId(x[k])).?.[k] ?? "";
      result.push({
        shipmentId: sid,
        transportType: choose("transportType"),
        importStatus: choose("importStatus"),
        eta: choose("eta"),
        productCount: productCountByShipment[sid] ?? 0,
      });
    }

    // filtro por búsqueda
    const s = q.toLowerCase().trim();
    const filtered = s
      ? result.filter((r) =>
          [r.shipmentId, r.transportType, r.importStatus].some((x) =>
            String(x || "").toLowerCase().includes(s)
          )
        )
      : result;

    // Orden por Shipment ID
    filtered.sort((a, b) => String(a.shipmentId).localeCompare(String(b.shipmentId)));
    return filtered;
  }, [imports, q, productCountByShipment]);

  // KPIs
  const total = grouped.length;
  const inTransit = grouped.filter((r) => String(r.importStatus || "").toLowerCase().includes("transit")).length;
  const warehouse = grouped.filter((r) => String(r.importStatus || "").toLowerCase().includes("warehouse")).length;

  return (
    <div className="p-6">
      <div className="mb-1 text-2xl font-semibold">Import Management</div>
      <p className="mb-5 text-gray-600">Track incoming shipments from suppliers and customs status.</p>

      {/* KPI cards (coloreadas y grandes) */}
      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard icon="PackageSearch" label="Total Shipments" value={total} tone="indigo" />
        <StatCard icon="Plane" label="In Transit" value={inTransit} tone="sky" />
        <StatCard icon="Warehouse" label="Warehouse" value={warehouse} tone="emerald" />
      </div>

      {/* Buscador + Refresh */}
      <div className="mb-3 flex items-center gap-3">
        <input
          className="w-full rounded-xl border px-3 py-2"
          placeholder="Search shipments by Shipment ID..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button variant="secondary" onClick={doRefresh} className="h-10">
          <Icon name="RotateCw" className="mr-2" /> Refresh Data
        </Button>
      </div>

      {loading && <div className="text-sm text-muted-foreground">Loading imports…</div>}
      {error && <div className="text-sm text-rose-600">Error: {String(error)}</div>}

      {/* Tabla agrupada */}
      <div className="overflow-x-auto rounded-xl border">
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
              <tr key={r.shipmentId} className="border-t">
                <td className="px-4 py-3">{r.shipmentId}</td>
                <td className="px-4 py-3">{r.productCount}</td>
                <td className="px-4 py-3">
                  <Pill tone={transportTone(r.transportType)}>{r.transportType || "—"}</Pill>
                </td>
                <td className="px-4 py-3">
                  <Pill tone={statusTone(r.importStatus)}>{r.importStatus || "—"}</Pill>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="px-2 py-1 text-xs"
                    onClick={() => setSelected(r)}
                  >
                    <Icon name="Eye" className="mr-1" size={14} />
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
