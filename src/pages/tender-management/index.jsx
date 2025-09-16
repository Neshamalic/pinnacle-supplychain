// src/pages/tender-management/index.jsx
import React, { useMemo, useState } from "react";
import { useSheet } from "@/lib/sheetsApi";
import { mapTenders, mapTenderItems } from "@/lib/adapters";
import { usePresentationCatalog } from "@/lib/catalog";

// UI
import TenderToolbar from "./components/TenderToolbar";
import TenderTable from "./components/TenderTable";
import TenderDetailsDrawer from "./components/TenderDetailsDrawer";

function fmtCLP(n) {
  const v = Number.isFinite(+n) ? +n : 0;
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(v);
}

export default function TenderManagementPage() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  // Carga base
  const { rows: tenders = [], loading: loadingTenders } = useSheet("tenders", mapTenders);
  const { rows: tenderItems = [], loading: loadingItems } = useSheet("tender_items", mapTenderItems);

  const { enrich } = usePresentationCatalog();

  // ====== Util común (idéntico a Overview del modal) ======
  const lineTotalCLP = (it) => {
    const qty = Number(it.awardedQty ?? it.qty ?? 0);
    const price = Number(it.unitPrice ?? 0);
    const packs = Number(it.packageUnits ?? 1);
    return qty * price * packs;
  };

  // ====== Grouping por tenderId y cálculo de métricas ======
  const tableRows = useMemo(() => {
    // enriquecemos para inyectar productName y packageUnits
    const itemsEnriched = enrich(tenderItems || []);

    // agrupamos por tenderId
    const byTender = new Map();
    for (const it of itemsEnriched) {
      const id = String(it.tenderId || "").trim();
      if (!id) continue;
      if (!byTender.has(id)) byTender.set(id, []);
      byTender.get(id).push(it);
    }

    // construimos filas finales
    cont rows = [];
    const seenTenderIds = new Set();
    for (const t of tenders || []) {
      const id = String(t.tenderId || "").trim();
      if (!id) continue;
          if (seenTenderIds.has(id)) continue;
    seenTenderIds.add(id);

      const items = byTender.get(id) || [];

      // productos únicos
      const products = new Set(items.map((x) => x.presentationCode)).size;

      // total CLP consistente con Overview (qty * price * packageUnits)
      const totalCLP = items.reduce((acc, x) => acc + lineTotalCLP(x), 0);

      // entrega (si no viene del master, tomamos la del tender)
      const deliveryDate = t.deliveryDate || null;

      rows.push({
        tenderId: id,
        title: t.title || "—",
        status: t.status || "",
        deliveryDate,
        products,
        // lo pasamos ya en número; la celda se encarga del formateo
        totalValueCLP: totalCLP,
        // (si tienes stockCoverage a nivel tender, mantenlo; si no, 0)
        stockCoverageDays: Number(t.stockCoverage || 0),
        _tender: t,
        _items: items,
      });
    }

    // orden opcional por fecha
    rows.sort((a, b) => {
      const da = a.deliveryDate ? new Date(a.deliveryDate).getTime() : 0;
      const db = b.deliveryDate ? new Date(b.deliveryDate).getTime() : 0;
      return da - db;
    });

    return rows;
  }, [tenders, tenderItems, enrich]);

  // handlers
  const handleView = (row) => {
    setSelected({
      ...row._tender,
      items: row._items.map((it) => ({
        ...it,
        lineTotalCLP: lineTotalCLP(it), // lo mismo que en Overview
      })),
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <TenderToolbar />

      {/* Tabla */}
      <TenderTable
        rows={tableRows}
        loading={loadingTenders || loadingItems}
        onView={handleView}
        // la tabla debe mostrar totalValueCLP -> formatear con fmtCLP
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
