// src/pages/tender-management/index.jsx
import React, { useMemo, useState } from "react";
import { format } from "date-fns";

import { useSheet, writeRow, updateRow } from "@/lib/sheetsApi";
import { mapTenders } from "@/lib/adapters";

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
    loading,
    error,
    reload,
  } = useSheet("tenders", mapTenders);

  // 1) Agrupación por tenderId (desduplicado)
  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of rawTenders) {
      const key = (r.tenderId || r.id || "").trim();
      if (!key) continue;

      const prev = map.get(key);
      if (!prev) {
        map.set(key, { ...r });
      } else {
        // Consolidación sencilla:
        map.set(key, {
          ...prev,
          // Preferimos la fecha más temprana
          deliveryDate:
            asDate(prev.deliveryDate) && asDate(r.deliveryDate)
              ? (asDate(prev.deliveryDate) < asDate(r.deliveryDate)
                  ? prev.deliveryDate
                  : r.deliveryDate)
              : prev.deliveryDate || r.deliveryDate,
          // Productos: tomamos el máximo entre duplicados
          productsCount: Math.max(
            Number(prev.productsCount || 0),
            Number(r.productsCount || 0)
          ),
          // Valor total: acumulamos
          totalValue: Number(prev.totalValue || 0) + Number(r.totalValue || 0),
          // Status: mantenemos el primero no vacío
          status: (prev.status || r.status || "").toLowerCase(),
        });
      }
    }
    return Array.from(map.values());
  }, [rawTenders]);

  // 2) Filtros (búsqueda, estado, periodo de contrato)
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    return (grouped || []).filter((r) => {
      // search por tenderId o title
      const hayCoincidencia =
        !term ||
        String(r.tenderId || "").toLowerCase().includes(term) ||
        String(r.title || "").toLowerCase().includes(term);

      // estado
      const okStatus =
        statusFilter === "all" ||
        (r.status || "").toLowerCase() === statusFilter;

      // periodo
      const d = asDate(r.deliveryDate);
      const okPeriod =
        (!from || (d && d >= from)) && (!to || (d && d <= to));

      return hayCoincidencia && okStatus && okPeriod;
    });
  }, [grouped, search, statusFilter, fromDate, toDate]);

  // 3) KPIs
  const kpis = useMemo(() => {
    const active = filtered.length;
    const awarded = filtered.filter((r) => r.status === "awarded").length;
    const inDelivery = filtered.filter((r) => r.status === "in delivery").length;
    const critical = filtered.filter((r) => Number(r.stockCoverage || 0) <= 0)
      .length;
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
    await reload?.();
    setOpenNewTender(false);
    setEditRow(null);
  };

  // Export a CSV del listado filtrado
  const exportCSV = () => {
    const headers = [
      "tenderId",
      "title",
      "status",
      "deliveryDate",
      "stockCoverage",
      "productsCount",
      "totalValueCLP",
    ];
    const lines = filtered.map((r) => [
      r.tenderId,
      r.title,
      r.status,
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

        {/* Contract Period */}
        <div className="flex items-end gap-2">
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
