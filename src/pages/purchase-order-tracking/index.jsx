// src/pages/purchase-order-tracking/index.jsx
import React, { useMemo, useState } from "react";
import { Eye, Edit, Download, Plus, RefreshCcw, Search } from "lucide-react";
import Button from "@/components/ui/Button";
import { useSheet } from "@/lib/sheetsApi";
import { mapPurchaseOrders } from "@/lib/adapters";
import OrderDetailsModal from "./components/OrderDetailsModal";

// Helpers
const norm = (s = "") => String(s || "").trim().toLowerCase();

const badgeClass = (status) => {
  const s = norm(status);
  if (s === "shipped") return "bg-purple-100 text-purple-700";
  if (s === "ready") return "bg-green-100 text-green-700";
  if (s.includes("process")) return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-700";
};

const fmtUSD = (n) =>
  `USD ${Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function PurchaseOrderTracking() {
  // Carga base
  const {
    rows: poRaw = [],
    loading,
    error,
    reload,
  } = useSheet("purchase_orders", mapPurchaseOrders);

  // Filtros locales
  const [q, setQ] = useState("");
  const [mfFilter, setMfFilter] = useState("");

  // Agrupar por poNumber
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
          _rows: [],
        });
      }
      const g = map.get(key);
      g.costUsd += Number(r.costUsd || 0);
      g._rows.push(r);
      // si alguno está “in process”/“ready”/“shipped”, priorizamos ese para el badge
      const order = ["shipped", "ready", "in process"];
      const pick = (a, b) => {
        const ai = order.indexOf(norm(a));
        const bi = order.indexOf(norm(b));
        if (ai === -1 && bi >= 0) return b;
        if (bi === -1 && ai >= 0) return a;
        if (ai >= 0 && bi >= 0) return ai <= bi ? a : b;
        return a || b;
      };
      g.manufacturingStatus = pick(g.manufacturingStatus, r.manufacturingStatus);
    }
    return Array.from(map.values()).sort((a, b) =>
      String(a.poNumber).localeCompare(String(b.poNumber))
    );
  }, [poRaw]);

  // KPIs
  const kpis = useMemo(() => {
    const total = groups.length;
    const inProcess = groups.filter((g) => norm(g.manufacturingStatus).includes("process")).length;
    const ready = groups.filter((g) => norm(g.manufacturingStatus) === "ready").length;
    const shipped = groups.filter((g) => norm(g.manufacturingStatus) === "shipped").length;
    return { total, inProcess, ready, shipped };
  }, [groups]);

  // Filtro aplicado
  const filtered = useMemo(() => {
    let list = groups;
    if (q.trim()) {
      const n = norm(q);
      list = list.filter(
        (g) =>
          norm(g.poNumber).includes(n) ||
          norm(g.tenderRef).includes(n)
      );
    }
    if (mfFilter) {
      const m = norm(mfFilter);
      list = list.filter((g) => norm(g.manufacturingStatus) === m);
    }
    return list;
  }, [groups, q, mfFilter]);

  // Drawer/Modal
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const openDetails = (g) => {
    setCurrent({
      poNumber: g.poNumber,
      tenderRef: g.tenderRef,
      manufacturingStatus: g.manufacturingStatus,
      transportType: g.transportType,
      costUsd: g.costUsd,
      // pasamos el primer row para mantener compatibilidad
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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={reload}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Total Orders</div>
          <div className="text-2xl font-semibold">{kpis.total}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">In Process</div>
          <div className="text-2xl font-semibold">{kpis.inProcess}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Ready</div>
          <div className="text-2xl font-semibold">{kpis.ready}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Shipped</div>
          <div className="text-2xl font-semibold">{kpis.shipped}</div>
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
            <option value="">Manufacturing Status (all)</option>
            <option value="in process">In Process</option>
            <option value="ready">Ready</option>
            <option value="shipped">Shipped</option>
          </select>
          <Button variant="ghost" onClick={() => { setQ(""); setMfFilter(""); }}>
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Tabla */}
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
            <div
              key={g.poNumber}
              className="grid grid-cols-12 px-4 py-3 border-t items-center"
            >
              <div className="col-span-3 font-medium">{g.poNumber}</div>
              <div className="col-span-3 text-sm text-muted-foreground">
                {g.tenderRef || "—"}
              </div>
              <div className="col-span-3">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(
                    g.manufacturingStatus
                  )}`}
                >
                  {g.manufacturingStatus || "—"}
                </span>
              </div>
              <div className="col-span-2 text-sm">{fmtUSD(g.costUsd)}</div>
              <div className="col-span-1 flex items-center justify-end gap-2">
                <button
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  onClick={() => openDetails(g)}
                >
                  <Eye className="h-4 w-4" /> View
                </button>
                <button
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
                  onClick={() => openDetails(g)}
                  title="Edit (opens the same details by ahora)"
                >
                  <Edit className="h-4 w-4" /> Edit
                </button>
              </div>
            </div>
          ))}
      </div>

      {open && current && (
        <OrderDetailsModal
          open={open}
          onClose={() => setOpen(false)}
          order={current}
        />
      )}
    </div>
  );
}
