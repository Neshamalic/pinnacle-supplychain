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
  const { rows: tenders = [], loading: loadingTenders } = useSheet("tenders", mapTenders);
  const { rows: tenderItems = [], loading: loadingItems } = useSheet("tender_items", mapTenderItems);

  // Desestructuramos la función `enrich` del hook
  const { enrich } = usePresentationCatalog();

  // Calcula el total CLP de un ítem (cantidad × precio × packs)
  const lineTotalCLP = (it) => {
    const qty = Number(it.awardedQty ?? it.qty ?? 0);
    const price = Number(it.unitPrice ?? 0);
    const packs = Number(it.packageUnits ?? 1);
    return qty * price * packs;
  };

  // Construcción de filas de la tabla agrupadas por tenderId
  const tableRows = useMemo(() => {
    // Enriquecemos los ítems para inyectar nombre de producto y packageUnits
    const itemsEnriched = enrich(tenderItems || []);

    // Agrupamos ítems por tenderId
    const byTender = new Map();
    for (const it of itemsEnriched) {
      const id = String(it.tenderId || "").trim();
      if (!id) continue;
      if (!byTender.has(id)) byTender.set(id, []);
      byTender.get(id).push(it);
    }

    // Construimos las filas finales sin duplicados
    const rows = [];
    const seenTenderIds = new Set();
    for (const t of tenders || []) {
      const id = String(t.tenderId || "").trim();
      if (!id) continue;
      // Si ya vimos este tenderId, lo saltamos
      if (seenTenderIds.has(id)) continue;
      seenTenderIds.add(id);

      // Ítems de este tenderId
      const items = byTender.get(id) || [];

      // Contamos productos únicos
      const products = new Set(items.map((x) => x.presentationCode)).size;

      // Total CLP (suma de qty × price × packs)
      const totalCLP = items.reduce((acc, x) => acc + lineTotalCLP(x), 0);

      // Fecha de entrega (o null si no viene del master)
      const deliveryDate = t.deliveryDate || null;

      rows.push({
        tenderId: id,
        title: t.title || "",
        status: t.status || "",
        deliveryDate,
        products,
        totalValueCLP: totalCLP,
        // Stock coverage a nivel tender; si no existe, 0
        stockCoverageDays: Number(t.stockCoverage || 0),
        // Guardamos referencia al tender y a sus ítems
        _tender: t,
        _items: items,
      });
    }

    // Orden opcional por fecha de entrega
    rows.sort((a, b) => {
      const da = a.deliveryDate ? new Date(a.deliveryDate).getTime() : 0;
      const db = b.deliveryDate ? new Date(b.deliveryDate).getTime() : 0;
      return da - db;
    });

    return rows;
  }, [tenders, tenderItems, enrich]);

  // Cuando el usuario hace clic en “View”
  const handleView = (row) => {
    setSelected({
      ...row._tender,
      // Enviamos los ítems con el total de cada uno
      items: row._items.map((it) => ({
        ...it,
        lineTotalCLP: lineTotalCLP(it),
      })),
    });
    setOpen(true);
  };

  return (
    <>
      <TenderToolbar />
      <TenderTable
        rows={tableRows}
        loading={loadingTenders || loadingItems}
        onView={handleView}
        valueFormatter={fmtCLP}
      />
      <TenderDetailsDrawer
        open={open}
        onClose={() => setOpen(false)}
        tender={selected}
      />
    </>
  );
}

