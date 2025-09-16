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

  // Carga base
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

  // Util para calcular total CLP de cada ítem
  const lineTotalCLP = (it) => {
    const qty = Number(it.awardedQty ?? it.qty ?? 0);
    const price = Number(it.unitPrice ?? 0);
    const packs = Number(it.packageUnits ?? 1);
    return qty * price * packs;
  };

  // Agrupamos por tenderId, calculando métricas para cada fila de la tabla
  const tableRows = useMemo(() => {
    // Enriquecemos los ítems para inyectar nombre de producto y unidades por paquete
    const itemsEnriched = enrich(tenderItems || []);

    // Agrupamos los ítems por su tenderId
    const byTender = new Map();
    for (const it of itemsEnriched) {
      const id = String(it.tenderId || "").trim();
      if (!id) continue;
      if (!byTender.has(id)) byTender.set(id, []);
      byTender.get(id).push(it);
    }

    // Construimos las filas finales (un row por tenderId)
    const rows = []; // Corregimos aquí: antes decía "cont rows = []"
    const seenTenderIds = new Set();
    for (const t of tenders || []) {
      const id = String(t.tenderId || "").trim();
      if (!id) continue;
      // Evitamos duplicar licitaciones con el mismo tenderId
      if (seenTenderIds.has(id)) continue;
      seenTenderIds.add(id);

      // Ítems de este tenderId
      const items = byTender.get(id) || [];

      // Contamos productos únicos
      const products = new Set(items.map((x) => x.presentationCode)).size;

      // Total CLP = suma de qty * price * packageUnits
      const totalCLP = items.reduce(
        (acc, x) => acc + lineTotalCLP(x),
        0
      );

      // Fecha de entrega (si no viene del master, tomamos la del tender)
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

    // Ordenamos por fecha de entrega
    rows.sort((a, b) => {
      const da = a.deliveryDate ? new Date(a.deliveryDate).getTime() : 0;
      const db = b.deliveryDate ? new Date(b.deliveryDate).getTime() : 0;
      return da - db;
    });

    return rows;
  }, [tenders, tenderItems, enrich]);

  // Handler para abrir el detalle de una licitación
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
      {/* Barra de herramientas (sin props porque no seleccionamos nada) */}
      <TenderToolbar />

      {/* Tabla con las licitaciones agrupadas */}
      <TenderTable
        rows={tableRows}
        loading={loadingTenders || loadingItems}
        onView={handleView}
        // Formateamos totalValueCLP usando fmtCLP
        valueFormatter={fmtCLP}
      />

      {/* Drawer con detalles de licitación */}
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

