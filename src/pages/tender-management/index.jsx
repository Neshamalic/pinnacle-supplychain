// src/pages/tender-management/index.jsx
import React, { useMemo, useState } from "react";
import { useSheet } from "@/lib/sheetsApi";
import { mapTenders, mapTenderItems } from "@/lib/adapters";
import { usePresentationCatalog } from "@/lib/catalog";

// UI components
import TenderToolbar from "./components/TenderToolbar";
import TenderTable from "./components/TenderTable";
import TenderDetailsDrawer from "./components/TenderDetailsDrawer";

// Formateo de pesos chilenos
function fmtCLP(n) {
  const v = Number.isFinite(+n) ? +n : 0;
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(v);
}

export default function TenderManagementPage() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  // Datos base desde Google Sheets (o tu fuente)
  const { rows: tenders = [], loading: loadingTenders } = useSheet(
    "tenders",
    mapTenders
  );
  const { rows: tenderItems = [], loading: loadingItems } = useSheet(
    "tender_items",
    mapTenderItems
  );

  // Obtenemos la función enrich para añadir productName y packageUnits
  const { enrich } = usePresentationCatalog();

  // Calcula el total CLP de cada ítem (cantidad × precio × packs)
  const lineTotalCLP = (it) => {
    const qty = Number(it.awardedQty ?? it.qty ?? 0);
    const price = Number(it.unitPrice ?? 0);
    const packs = Number(it.packageUnits ?? 1);
    return qty * price * packs;
  };

  // Agrupa por tenderId y calcula métricas para cada fila de la tabla
  const tableRows = useMemo(() => {
    const itemsEnriched = enrich(tenderItems || []);

    // Agrupamos ítems por tenderId
    const byTender = new Map();
    for (const it of itemsEnriched) {
      const id = String(it.tenderId || "").trim();
      if (!id) continue;
      if (!byTender.has(id)) byTender.set(id, []);
      byTender.get(id).push(it);
    }

    // Construimos las filas finales (una por tenderId)
    const rows = [];
    const seenTenderIds = new Set();
    for (const t of tenders || []) {
      const id = String(t.tenderId || "").trim();
      if (!id) continue;
      // Evitamos duplicar licitaciones con el mismo tenderId
      if (seenTenderIds.has(id)) continue;
      seenTenderIds.add(id);

      const items = byTender.get(id) || [];

      // Contamos productos únicos
      const products = new Set(items.map((x) => x.presentationCode)).size;

      // Total CLP: suma de qty × price × packageUnits
      const totalCLP = items.reduce(
        (acc, x) => acc + lineTotalCLP(x),
        0
      );

      // Fecha de entrega (si no viene del master, usamos null)
      const deliveryDate = t.deliveryDate || null;

      rows.push({
        tenderId: id,
        title: t.title || "—",
        status: t.status || "",
        deliveryDate,
        products,
        totalValueCLP: totalCLP,
        stockCoverageDays: Number(t.stockCoverage || 0),
        _tender: t,
        _items: items,
      });
    }

    // Ordenamos por fecha de entrega ascendente
    rows.sort((a, b) => {
      const da = a.deliveryDate ? new Date(a.deliveryDate).getTime() : 0;
      const db = b.deliveryDate ? new Date(b.deliveryDate).getTime() : 0;
      return da - db;
    });

    return rows;
  }, [tenders, tenderItems, enrich]);

  // ========== Nuevas métricas y estados para el Toolbar ==========
  // Modo de vista (table | card) — mantenemos table fijo por ahora
  const [viewMode, setViewMode] = useState("table");

  // Selección de filas (por ahora no hay selección, valor fijo 0)
  const selectedCount = 0;

  // Calculamos estadísticas por estado de licitación
  const stats = useMemo(() => {
    const s = { active: 0, awarded: 0, inDelivery: 0, critical: 0 };
    tableRows.forEach((row) => {
      const status = (row.status || "").toLowerCase();
      if (status.includes("active") || status.includes("activo")) {
        s.active += 1;
      } else if (status.includes("award") || status.includes("adjud")) {
        s.awarded += 1;
      } else if (
        status.includes("delivery") ||
        status.includes("entrega")
      ) {
        s.inDelivery += 1;
      } else if (status.includes("critical") || status.includes("crític")) {
        s.critical += 1;
      }
    });
    return s;
  }, [tableRows]);

  // Handler para ver el detalle de la licitación
  const handleView = (row) => {
    setSelected({
      ...row._tender,
      items: row._items.map((it) => ({
        ...it,
        lineTotalCLP: lineTotalCLP(it),
      })),
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar con métricas dinámicas */}
      <TenderToolbar
        selectedCount={selectedCount}
        totalCount={tableRows.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onNewTender={() => {}}
        onExport={() => {}}
        onBulkAction={() => {}}
        stats={stats}
      />

      {/* Tabla de licitaciones agrupadas */}
      <TenderTable
        rows={tableRows}
        loading={loadingTenders || loadingItems}
        onView={handleView}
        valueFormatter={fmtCLP}
      />

      {/* Drawer de detalles */}
      {open && selected && (
        <TenderDetailsDrawer
          open={open}
          onClose={() => setOpen(false)}
          tender={selected}
        />
      )}
    </div>
  );
}
