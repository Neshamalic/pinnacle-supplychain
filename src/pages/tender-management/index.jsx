// src/pages/tender-management/index.jsx
import React, { useMemo, useState } from "react";
import { format } from "date-fns";

import { useSheet } from "@/lib/sheetsApi";
import { mapTenders, mapTenderItems } from "@/lib/adapters";

import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import TenderDetailsDrawer from "./components/TenderDetailsDrawer";
import NewTenderModal from "./components/NewTenderModal";

const fmtCLP = (n) =>
  typeof n === "number"
    ? `CLP ${n.toLocaleString("es-CL")}`
    : `CLP ${Number(n || 0).toLocaleString("es-CL")}`;

const asDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

export default function TenderManagementPage() {
  // --- Estado UI ---
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState(""); // Contract Period (desde)
  const [toDate, setToDate] = useState(""); // Contract Period (hasta)
  const [openDrawer, setOpenDrawer] = useState(false);
  const [selected, setSelected] = useState(null);
  const [openNewTender, setOpenNewTender] = useState(false);
  const [editRow, setEditRow] = useState(null);

  // --- Datos ---
  const {
    rows: rawTenders = [],
    loading: loadingTenders,
    reload: reloadTenders,
  } = useSheet("tenders", mapTenders);

  const {
    rows: tenderItems = [],
    loading: loadingItems,
  } = useSheet("tender_items", mapTenderItems);

  // ---- Agregamos métricas por tenderId a partir de tender_items ----
  const itemsAggByTender = useMemo(() => {
    const map = new Map(); // tenderId -> {productsCount, totalValue, stockCoverage, contractStart, contractEnd}
    for (const it of tenderItems || []) {
      const key = (it.tenderId || "").trim();
      if (!key) continue;
      const entry = map.get(key) || {
        _set: new Set(),
        totalValue: 0,
        stockCoverage: null,
        contractStart: null,
        contractEnd: null,
      };
      if (it.presentationCode) entry._set.add(it.presentationCode);
      entry.totalValue += Number(it.lineTotal || 0);

      // stock coverage -> tomamos el mínimo (más crítico) disponible
      if (it.stockCoverageDays != null && it.stockCoverageDays !== "") {
        const v = Number(it.stockCoverageDays);
        if (Number.isFinite(v)) {
          if (entry.stockCoverage == null) entry.stockCoverage = v;
          else entry.stockCoverage = Math.min(entry.stockCoverage, v);
        }
      }

      // contract period -> mínimo start y máximo end
      const cs = asDate(it.contractStart);
      const ce = asDate(it.contractEnd);
      if (cs) entry.contractStart = !entry.contractStart || cs < entry.contractStart ? cs : entry.contractStart;
      if (ce) entry.contractEnd = !entry.contractEnd || ce > entry.contractEnd ? ce : entry.contractEnd;

      map.set(key, entry);
    }
    // transpilar a objeto limpio
    const out = new Map();
    for (const [k, v] of map.entries()) {
      out.set(k, {
        productsCount: v._set.size,
        totalValue: v.totalValue,
        stockCoverage: v.stockCoverage,
        contractStart: v.contractStart ? v.contractStart.toISOString() : "",
        contractEnd: v.contractEnd ? v.contractEnd.toISOString() : "",
      });
    }
    return out;
  }, [tenderItems]);

  // 1) Agrupamos tender rows por tenderId (desduplicado básico)
  const groupedTenders = useMemo(() => {
    const map = new Map();
    for (const r of rawTenders) {
      const key = (r.tenderId || r.id || "").trim();
      if (!key) continue;
      if (!map.has(key)) map.set(key, { ...r });
      else {
        const prev = map.get(key);
        map.set(key, {
          ...prev,
          deliveryDate:
            asDate(prev.deliveryDate) && asDate(r.deliveryDate)
              ? (asDate(prev.deliveryDate) < asDate(r.deliveryDate)
                  ? prev.deliveryDate
                  : r.deliveryDate)
              : prev.deliveryDate || r.deliveryDate,
          status: (prev.status || r.status || "").toLowerCase(),
        });
      }
    }
    // Mezclamos la agregación de items (products, totals, stockCoverage, contract period)
    return Array.from(map.values()).map((row) => {
      const agg = itemsAggByTender.get(row.tenderId || row.id) || {};
      return {
        ...row,
        productsCount: agg.productsCount ?? row.productsCount ?? 0,
        totalValue: agg.totalValue ?? row.totalValue ?? 0,
        stockCoverage: agg.stockCoverage ?? row.stockCoverage ?? null,
        contractStart: agg.contractStart || "",
        contractEnd: agg.contractEnd || "",
      };
    });
  }, [rawTenders, itemsAggByTender]);

  // 2) Filtros (búsqueda, estado, contract period)
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    const overlaps = (start, end) => {
      if (!from && !to) return true;
      const s = asDate(start);
      const e = asDate(end);
      if (s && e) {
        if (from && e < from) return false;
        if (to && s > to) return false;
        return true;
      }
      // si no hay período, caemos al deliveryDate como fallback
      const d = asDate(start) || asDate(end) || null;
      if (!from && to && d) return d <= to;
      if (from && !to && d) return d >= from;
      if (from && to && d) return d >= from && d <= to;
      return true;
    };

    return (groupedTenders || []).filter((r) => {
      const okSearch =
        !term ||
        String(r.tenderId || "").toLowerCase().includes(term) ||
        String(r.title || "").toLowerCase().includes(term);

      const okStatus =
        statusFilter === "all" ||
        (r.status || "").toLowerCase() === statusFilter;

      const okPeriod = overlaps(r.contractStart, r.contractEnd || r.deliveryDate);

      return okSearch && okStatus && okPeriod;
    });
  }, [groupedTenders, search, statusFilter, fromDate, toDate]);

  // 3) KPIs
  const kpis = useMemo(() => {
    const active = filtered.length;
    const awarded = filtered.filter((r) => (r.status || "") === "awarded").length;
    const inDelivery = filtered.filter((r) => (r.status || "") === "in delivery").length;
    const critical = filtered.filter((r) => Number(r.stockCoverage || 0) <= 0).length;
    return { active, awarded, inDelivery, critical };
  }, [filtered]);

  // --- Acciones UI ---
  const onView = (row) => {
    setSelected(row);
    setOpenDrawer(true);
  };
  const onEdit = (row) => {
    setEditRow(row);
    setOpenNewTender(true);
  };
  const onNew = () => {
    setEditRow(null);
    setOpenNewTender(true);
  };
  const onSavedTender = async () => {
    await reloadTenders?.();
    setOpenNewTender(false);
    setEditRow(null);
  };
  const exportCSV = () => {
    const headers = [
      "tenderId",
      "title",
      "status",
      "contractStart",
      "contractEnd",
      "deliveryDate",
      "stockCoverageDays",
      "productsCount",
      "totalValueCLP",
    ];
    const lines = filtered.map((r) => [
      r.tenderId,
      r.title,
      r.status,
      r.contractStart ? format(new Date(r.contractStart), "yyyy-MM-dd") : "",
      r.contractEnd ? format(new Date(r.contractEnd), "yyyy-MM-dd") : "",
      r.deliveryDate ? format(new Date(r.deliveryDate), "yyyy-MM-dd") : "",
      r.stockCoverage ?? "",
      r.productsCount ?? "",
      Number(r.totalValue || 0),
    ]);
    const csv =
      "\ufeff" +
      [headers.join(","), ...lines.map((arr) => arr.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tenders_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setFromDate("");
    setToDate("");
  };

  const loading = loadingTenders || loadingItems;

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Tender Management</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" iconName="Download" onClick={exportCSV}>
            Export
          </Button>
          <Button iconName="Plus" onClick={onNew}>
            New Tender
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
        <KpiCard icon="Boxes" label="Active" value={kpis.active} />
        <KpiCard icon="Medal" label="Awarded" value={kpis.awarded} />
        <KpiCard icon="Truck" label="In Delivery" value={kpis.inDelivery} />
        <KpiCard icon="AlertTriangle" label="Critical" value={kpis.critical} />
      </div>

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-end mb-4">
        <div className="flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenders..."
            className="w-full h-10 rounded-md border px-3"
          />
        </div>

        {/* Contract Period (desde / hasta) */}
        <div className="text-sm">
          <div className="text-muted-foreground mb-1">Contract period (from)</div>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-10 rounded-md border px-2"
          />
        </div>
        <div className="text-sm">
          <div className="text-muted-foreground mb-1">to</div>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-10 rounded-md border px-2"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border px-2"
            title="Status"
          >
            <option value="all">All status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="rejected">Rejected</option>
            <option value="awarded">Awarded</option>
            <option value="in delivery">In Delivery</option>
          </select>
        </div>

        <div>
          <Button variant="secondary" onClick={clearFilters} iconName="XCircle">
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="px-4 py-3">Tender ID</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Delivery Date</th>
              <th className="px-4 py-3">Stock Coverage</th>
              <th className="px-4 py-3">Total Value</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((r) => (
              <tr key={r.tenderId}>
                <td className="px-4 py-3 font-medium">{r.tenderId}</td>
                <td className="px-4 py-3">{r.title || "—"}</td>
                <td className="px-4 py-3">{r.productsCount ?? "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3">
                  {r.deliveryDate
                    ? format(new Date(r.deliveryDate), "dd-MM-yyyy")
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  {r.stockCoverage != null ? `${r.stockCoverage} days` : "—"}
                </td>
                <td className="px-4 py-3 font-semibold">
                  {fmtCLP(r.totalValue || 0)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => onView(r)}>
                      View
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onEdit(r)}>
                      Edit
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No tenders found with current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer de vista */}
      {openDrawer && selected && (
        <TenderDetailsDrawer
          open={openDrawer}
          onClose={() => setOpenDrawer(false)}
          tender={selected}
        />
      )}

      {/* Modal para crear/editar */}
      {openNewTender && (
        <NewTenderModal
          open={openNewTender}
          onClose={() => {
            setOpenNewTender(false);
            setEditRow(null);
          }}
          mode={editRow ? "edit" : "create"}
          defaultValues={editRow || {}}
          onSaved={onSavedTender}
        />
      )}
    </div>
  );
}

/* ---------- Helpers de UI ---------- */

function KpiCard({ icon, label, value }) {
  return (
    <div className="rounded-lg border p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon name={icon} size={18} />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = (status || "").toLowerCase();
  const tone =
    s === "awarded"
      ? "bg-green-100 text-green-700"
      : s === "rejected"
      ? "bg-rose-100 text-rose-700"
      : s === "submitted"
      ? "bg-blue-100 text-blue-700"
      : s === "in delivery"
      ? "bg-amber-100 text-amber-700"
      : "bg-muted text-foreground";
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${tone}`}>
      {status || "—"}
    </span>
  );
}
