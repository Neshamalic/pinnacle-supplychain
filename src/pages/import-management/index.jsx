// src/pages/import-management/index.jsx
import { useMemo, useState, useCallback } from "react";
import { useSheet } from "@/lib/sheetsApi";
import {
  mapImports,
  mapImportItems,
  mapPresentationMaster,
} from "@/lib/adapters";

// Componentes de la página (ya existentes en tu repo)
import ImportFilters from "./components/ImportFilters.jsx";
import ImportTable from "./components/ImportTable.jsx";
import ImportDetailsDrawer from "./components/ImportDetailsDrawer.jsx";
// (Si tienes cards/estadísticas arriba, puedes importarlas también)

export default function ImportManagement() {
  /* 1) Fuente de verdad: hojas */
  const {
    rows: importRows,
    loading: loadingImports,
    refetch: refetchImports,
  } = useSheet("imports", mapImports);

  const { rows: itemRows, loading: loadingItems } = useSheet(
    "import_items",
    mapImportItems
  );

  // Maestro de presentaciones: presentation_code -> { productName, packageUnits }
  const { rows: presRows } = useSheet(
    "product_presentation_master",
    mapPresentationMaster
  );

  /* 2) Índice por código de presentación para nombre y unidades por empaque */
  const productIndex = useMemo(() => {
    const idx = {};
    for (const r of presRows) {
      if (!r.presentationCode) continue;
      idx[r.presentationCode] = {
        productName: r.productName || "",
        packageUnits: r.packageUnits || 0,
      };
    }
    return idx;
  }, [presRows]);

  /* 3) Mapeo de shipments -> conjunto de OCI */
  const ociByShipment = useMemo(() => {
    // Un shipment_id puede tener varias OCI; las agrupamos
    const map = {};
    for (const imp of importRows) {
      const ship = String(imp.shipmentId || "");
      const oci = String(imp.ociNumber || "");
      if (!ship) continue;
      if (!map[ship]) map[ship] = new Set();
      if (oci) map[ship].add(oci);
    }
    return map;
  }, [importRows]);

  /* 4) Ítems por shipment (usa las OCI de ese shipment) */
  const itemsByShipment = useMemo(() => {
    const byShip = {};
    // Por cada shipment, recoge todos los items cuyas OCI estén asociadas
    for (const [ship, ociSet] of Object.entries(ociByShipment)) {
      byShip[ship] = itemRows.filter((it) =>
        ociSet.has(String(it.ociNumber || ""))
      );
    }
    return byShip;
  }, [ociByShipment, itemRows]);

  /* 5) UI: selección y drawer */
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);

  const handleViewDetails = useCallback((row) => {
    setSelected(row);
    setOpen(true);
  }, []);

  const handleCloseDetails = useCallback(() => setOpen(false), []);

  const itemsForSelected = useMemo(() => {
    if (!selected?.shipmentId) return [];
    return itemsByShipment[String(selected.shipmentId)] || [];
  }, [itemsByShipment, selected]);

  /* 6) Render */
  return (
    <div className="space-y-16">
      {/* Filtros (mantén tus props si los usas) */}
      <ImportFilters
        // Ejemplo: onChange={setFilters}
      />

      {/* Tabla principal */}
      <ImportTable
        rows={importRows}
        loading={loadingImports || loadingItems}
        // callback que la tabla debe llamar cuando el usuario hace "View Details"
        onViewDetails={handleViewDetails}
        // Si tu tabla usa otros props (filtros, búsqueda, etc.), déjalos también aquí
      />

      {/* Drawer de Detalle */}
      <ImportDetailsDrawer
        open={open}
        onClose={handleCloseDetails}
        importRow={selected}
        items={itemsForSelected}
        /* ⬇️  NUEVO: índice para mostrar product_name y package_units */
        productIndex={productIndex}
        // Si tu drawer acepta más props (timeline, comunicaciones, etc.), pásalos también
      />
    </div>
  );
}
