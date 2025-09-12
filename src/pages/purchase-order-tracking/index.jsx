// src/pages/purchase-order-tracking/index.jsx
import React, { useMemo, useState } from "react";
import {
  Eye,
  Edit,
  RefreshCcw,
  Search,
  ShoppingCart,
  Loader,
  CheckCircle2,
  Truck,
  Calendar,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { useSheet } from "@/lib/sheetsApi";
import { mapPurchaseOrders } from "@/lib/adapters";
import OrderDetailsModal from "./components/OrderDetailsModal";

// Utils
const norm = (s = "") => String(s || "").trim().toLowerCase();
const fmtUSD = (n) =>
  `USD ${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const mfBadge = (status) => {
  const s = norm(status);
  if (s === "shipped") return "bg-purple-100 text-purple-700";
  if (s === "ready") return "bg-green-100 text-green-700";
  if (s.includes("process")) return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-700";
};

export default function PurchaseOrderTracking() {
  // Datos base
  const { rows: poRaw = [], loading, reload } = useSheet(
    "purchase_orders",
    mapPurchaseOrders
  );

  // ------- Agrupación por PO -------
  const groups = useMemo(() => {
    const map = new Map();
    for (const r of poRaw || []) {
      const key = r.poNumber;
      if (!key) continue;

      if (!map.has(key)) {
        map.set(key, {
          poNumber: key,
          tenderRef: r.tenderRef || "",
          manufacturingStatus: r.manufacturingStatus || "",
          qcStatus: r.qcStatus || "",
          transportType: r.transportType || "",
          costUsd: 0,
          productionDays: 0,
          _rows: [],
        });
      }
      const g = map.get(key);
      g._rows.push(r);
      g.costUsd += Number(r.costUsd || 0);

      // priorizamos el “mejor” estado visible
      const order = ["shipped", "ready", "in process"];
      const best = (a, b) => {
        const ai = order.indexOf(norm(a));
        const bi = order.indexOf(norm(b));
        if (ai === -1 && bi >= 0) return b;
        if (bi === -1 && ai >= 0) return a;
        if (ai >= 0 && bi >= 0) return ai <= bi ? a : b;
        return a || b;
      };
      g.manufacturingStatus = best(g.manufacturingStatus, r.manufacturingStatus);

      // si tienes días de producción por fila, sumamos para promediar
      const d = Number(r.productionDays || 0);
      if (!Number.isNaN(d)) g.productionDays += d;

      // si no tuviera qcStatus en el grupo, toma alguno
      if (!g.qcStatus && r.qcStatus) g.qcStatus = r.qcStatus;
      if (!g.transportType && r.transportType) g.transportType = r.transportType;
    }

    return Array.from(map.values()).sort((a, b) =>
      String(a.poNumber).localeCompare(String(b.poNumber))
    );
  }, [poRaw]);

  // ------- KPI -------
  const kpis = useMemo(() => {
    const total = groups.length;
    const inProcess = groups.filter((g) => norm(g.manufacturingStatus).includes("process")).length;
    const ready = groups.filter((g) => norm(g.manufacturingStatus) === "ready").length;
    const shipped = groups.filter((g) => norm(g.manufacturingStatus) === "shipped").length;

    // promedio de productionDays si existe la columna
    let totalDays = 0;
    let counted = 0;
    for (const g of groups) {
      if (g.productionDays > 0 && g._rows?.length) {
        totalDays += g.productionDays / g._rows.length;
        counted++;
      }
    }
    const avgProd = counted ? Math.round(totalDays / counted) : null;
    return { total, inProcess, ready, shipped, avgProd };
  }, [groups]);

  // ------- Filtros -------
  const [q, setQ] = useState("");
  const [mfFilter, setMfFilter] = useState("");
  const [qcFilter, setQcFilter] = useState("");
  const [showMore, setShowMore] = useState(false);

  // opciones únicas
  const mfOptions = useMemo(
    () =>
      Array.from(
        new Set(groups.map((g) => g.manufacturingStatus).filter(Boolean))
      ).sort(),
    [groups]
  );
  const qcOptions = useMemo(
    () => Array.from(new Set(groups.map((g) => g.qcStatus).filter(Boolean))).sort(),
    [groups]
  );

  const filtered = useMemo(() => {
    let list = groups;
    if (q.trim()) {
      const n = norm(q);
      list = list.filter(
        (g) => norm(g.poNumber).includes(n) || norm(g.tenderRef).includes(n)
      );
    }
    if (mfFilter) list = list.filter((g) => norm(g.manufacturingStatus) === norm(mfFilter));
    if (qcFilter) list = list.filter((g) => norm(g.qcStatus) === norm(qcFilter));
    return list;
  }, [groups, q, mfFilter, qcFilter]);

  // ------- Drawer -------
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const openDetails = (g) => {
    setCurrent({
      poNumber: g.poNumber,
      tenderRef: g.tenderRef,
      manufacturingStatus: g.manufacturingStatus,
      transportType: g.transportType,
      costUsd: g.costUsd,
      // compat con tu modal
      ...g._rows?.[0],
    });
    setOpen(true);
  };

  return (
    <div className="px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Purchase Order Tracking</h1>
          <p className="text-sm text-muted-foreground">
            Monitor production status and shipment coordination for orders to India
          </p>
        </div>
        <Button variant="outline" onClick={reload}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* KPI Cards con íconos */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="rounded-lg border p-4 flex items-center gap-3">
          <ShoppingCart className="h-6 w-6 text-muted-foreground" />
          <div>
            <div className="text-xs text-muted-foreground">Total Orders</div>
            <div className="text-2xl font-semibold">{kpis.total}</div>
          </div>
        </div>
        <div className="rounded-lg border p-4 flex items-center gap-3">
          <Loader className="h-6 w-6 text-amber-600" />
          <div>
            <div className="text-xs text-muted-foreground">In Process</div>
            <div className="text-2xl font-semibold">{kpis.inProcess}</div>
          </div>
        </div>
        <div className="rounded-lg border p-4 flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <div>
            <div className="text-xs text-muted-foreground">Ready</div>
            <div className="text-2xl font-semibold">{kpis.ready}</div>
          </div>
        </div>
        <div className="rounded-lg border p-4 flex items-center gap-3">
          <Truck className="h-6 w-6 text-purple-600" />
          <div>
            <div className="text-xs text-muted-foreground">Shipped</div>
            <div className="text-2xl font-semibold">{kpis.shipped}</div>
          </div>
        </div>
        <div className="rounded-lg border p-4 flex items-center gap-3">
          <Calendar className="h-6 w-6 text-muted-foreground" />
          <div>
            <div className="text-xs text-muted-foreground">Avg. Production Time</div>
            <div className="text-2xl font-semibold">
              {kpis.avgProd != null ? `${kpis.avgProd}d` : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-lg border p-3 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <input
              className="w-full pl-9 pr-3 py-2 rounded-md border bg-background text-sm outline-none"
              placeholder="Search by PO number or tender ref…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <select
            value={mfFilter}
            onChange={(e) => setMfFilter(e.target.value)}
            className="h-9 rounded-md border bg-background text-sm px-3"
          >
            <option value="">Manufacturing (all)</option>
            {mfOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>

          <button
            className="text-sm text-muted-foreground underline"
            onClick={() => setShowMore((s) => !s)}
          >
            {showMore ? "Hide Filters" : "Show More Filters"}
          </button>

          <Button variant="ghost" onClick={() => { setQ(""); setMfFilter(""); setQcFilter(""); }}>
            Clear Filters
          </Button>
        </div>

        {showMore && (
          <div className="mt-3 flex flex-col md:flex-row gap-3">
            <select
              value={qcFilter}
              onChange={(e) => setQcFilter(e.target.value)}
              className="h-9 rounded-md border bg-background text-sm px-3"
            >
              <option value="">QC Status (all)</option>
              {qcOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabla agrupada por PO */}
      <div className="rounded-lg border overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2 text-xs text-muted-foreground bg-muted/40">
          <div className="col-span-3">PO Number</div>
          <div className="col-span-3">Tender Ref</div>
          <div className="col-span-3">Manufacturing</div>
          <div className="col-span-2">Cost (USD)</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {loading && (
          <div className="px-4 py-6 text-sm text-muted-foreground">Loading…</div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="px-4 py-6 text-sm text-muted-foreground">No orders found.</div>
        )}

        {!loading &&
          filtered.map((g) => (
            <div key={g.poNumber} className="grid grid-cols-12 px-4 py-3 border-t items-center">
              <div className="col-span-3 font-medium">{g.poNumber}</div>
              <div className="col-span-3 text-sm text-muted-foreground">{g.tenderRef || "—"}</div>
              <div className="col-span-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${mfBadge(g.manufacturingStatus)}`}>
                  {g.manufacturingStatus || "—"}
                </span>
              </div>
              <div className="col-span-2 text-sm">{fmtUSD(g.costUsd)}</div>
              <div className="col-span-1 flex items-center justify-end gap-2">
                <button className="inline-flex items-center gap-1 text-sm text-primary hover:underline" onClick={() => openDetails(g)}>
                  <Eye className="h-4 w-4" /> View
                </button>
                <button className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline" onClick={() => openDetails(g)} title="Edit">
                  <Edit className="h-4 w-4" /> Edit
                </button>
              </div>
            </div>
          ))}
      </div>

      {open && current && (
        <OrderDetailsModal open={open} onClose={() => setOpen(false)} order={current} />
      )}
    </div>
  );
}
