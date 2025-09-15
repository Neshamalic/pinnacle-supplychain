// src/pages/tender-management/index.jsx
import React, { useMemo, useState } from "react";
import { useSheet } from "@/lib/sheetsApi";
import {
  mapTenders,
  mapTenderItems,
} from "@/lib/adapters";
import { usePresentationCatalog } from "@/lib/catalog";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import TenderStatusBadge from "./components/TenderStatusBadge";
import StockCoverageBadge from "./components/StockCoverageBadge";
import TenderDetailsDrawer from "./components/TenderDetailsDrawer";

function fmtCLP(n) {
  const v = typeof n === "number" ? n : Number(n || 0);
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(v);
}
function fmtDate(dLike) {
  if (!dLike) return "—";
  const d = new Date(dLike);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export default function TenderManagementPage() {
  // Data
  const { rows: tendersRaw = [], loading: loadingTenders } = useSheet("tenders", mapTenders);
  const { rows: itemsRaw = [], loading: loadingItems } = useSheet("tender_items", mapTenderItems);
  const { enrich } = usePresentationCatalog();

  // UI state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // '', 'draft', 'submitted', 'awarded', 'in delivery', 'rejected'...
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  // Enriquecemos y calculamos totales por tender
  const tenderItemsByTender = useMemo(() => {
    const by = new Map();
    for (const it of enrich(itemsRaw)) {
      const key = it.tenderId || "";
      if (!key) continue;
      const arr = by.get(key) || [];
      arr.push(it);
      by.set(key, arr);
    }
    return by;
  }, [itemsRaw, enrich]);

  const rows = useMemo(() => {
    return (tendersRaw || []).map((t) => {
      const list = tenderItemsByTender.get(t.tenderId) || [];
      const products = new Set(list.map((i) => i.presentationCode)).size;
      const totalValue = list.reduce(
        (acc, r) => acc + (Number(r.awardedQty || 0) * Number(r.unitPrice || 0) * (r.packageUnits || 1)),
        0
      );
      // coverage simple: min stockCoverageDays de las líneas con dato; si no hay, usa t.stockCoverage
      const lineCoverages = list.map((r) => Number(r.stockCoverageDays || 0)).filter(Boolean);
      const stockCoverageDays = lineCoverages.length ? Math.min(...lineCoverages) : Number(t.stockCoverage || 0);
      return {
        ...t,
        products,
        totalValue,
        stockCoverageDays,
      };
    });
  }, [tendersRaw, tenderItemsByTender]);

  // Filtros
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      const okSearch =
        !s ||
        (r.tenderId || "").toLowerCase().includes(s) ||
        (r.title || "").toLowerCase().includes(s);
      const st = (r.status || "").toLowerCase();
      const okStatus = !statusFilter || st === statusFilter.toLowerCase();
      return okSearch && okStatus;
    });
  }, [rows, search, statusFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filtered.length;
    const awarded = filtered.filter((r) => (r.status || "").toLowerCase() === "awarded").length;
    const inDelivery = filtered.filter((r) => (r.status || "").includes("delivery")).length;
    const critical = filtered.filter((r) => Number(r.stockCoverageDays || 0) > 0 && Number(r.stockCoverageDays) < 15).length;
    return { total, awarded, inDelivery, critical };
  }, [filtered]);

  const onView = (row) => {
    setCurrent(row);
    setOpen(true);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Tender Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage and oversee all CENABAST tenders from registration through delivery tracking.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" iconName="Download">Export</Button>
          <Button iconName="Plus">New Tender</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard icon="PackageSearch" label="Active" value={kpis.total} />
        <KpiCard icon="Award" label="Awarded" value={kpis.awarded} />
        <KpiCard icon="Truck" label="In Delivery" value={kpis.inDelivery} />
        <KpiCard icon="AlertTriangle" label="Critical" value={kpis.critical} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 px-3 rounded-md border bg-background"
            placeholder="Search tenders..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-md border bg-background"
        >
          <option value="">All status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="awarded">Awarded</option>
          <option value="in delivery">In Delivery</option>
          <option value="rejected">Rejected</option>
        </select>
        <Button variant="secondary" onClick={() => { setSearch(""); setStatusFilter(""); }}>
          Clear Filters
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="grid grid-cols-12 bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
          <div className="col-span-2">Tender ID</div>
          <div className="col-span-3">Title</div>
          <div className="col-span-1">Products</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1">Delivery Date</div>
          <div className="col-span-1">Stock Coverage</div>
          <div className="col-span-2 text-right">Total Value</div>
        </div>

        {(loadingTenders || loadingItems) && (
          <div className="p-4 text-sm text-muted-foreground">Loading data…</div>
        )}

        {!loadingTenders && filtered.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">No tenders match your filters.</div>
        )}

        {filtered.map((r) => (
          <div key={r.tenderId} className="grid grid-cols-12 items-center px-4 py-3 border-t hover:bg-muted/30">
            <div className="col-span-2 font-medium">{r.tenderId}</div>
            <div className="col-span-3 text-sm">{r.title || "—"}</div>
            <div className="col-span-1 text-sm">{r.products}</div>
            <div className="col-span-2"><TenderStatusBadge status={r.status} /></div>
            <div className="col-span-1 text-sm">{fmtDate(r.deliveryDate)}</div>
            <div className="col-span-1"><StockCoverageBadge days={r.stockCoverageDays} /></div>
            <div className="col-span-2 flex items-center justify-end gap-3">
              <div className="text-sm font-semibold">{fmtCLP(r.totalValue)}</div>
              <Button size="sm" variant="ghost" onClick={() => onView(r)}><Icon name="Eye" size={16} /> View</Button>
              <Button size="sm" variant="ghost"><Icon name="Pencil" size={16} /> Edit</Button>
            </div>
          </div>
        ))}
      </div>

      {/* Drawer */}
      {open && current && (
        <TenderDetailsDrawer
          open={open}
          onClose={() => setOpen(false)}
          tender={current}
        />
      )}
    </div>
  );
}

function KpiCard({ icon = "Activity", label, value }) {
  return (
    <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon name={icon} size={18} className="text-primary" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-semibold">{value}</div>
      </div>
    </div>
  );
}

