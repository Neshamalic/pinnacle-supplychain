// src/pages/import-management/components/ImportDetailsDrawer.jsx
import React, { useMemo } from "react";
import Button from "@/components/ui/Button";
import { useSheet } from "@/lib/sheetsApi";
import { mapImportItems, _utils } from "@/lib/adapters"; // para toNumber
import ImportDetails from "./ImportDetails";

/**
 * Drawer de detalle de un import.
 *
 * Props soportadas:
 * - open / isOpen: boolean
 * - onClose: () => void
 * - importRow / selectedImport / row: objeto del shipment seleccionado
 * - items: (opcional) array de ítems ya filtrados por shipment (preferido)
 * - productIndex: (opcional) { [presentationCode]: { productName, packageUnits } }
 *
 * Si no se provee `items`, el componente intentará filtrar desde la hoja
 * `import_items` usando shipmentId, ociNumber o poNumber.
 */
export default function ImportDetailsDrawer(props) {
  const isOpen = (props.isOpen ?? props.open ?? false) === true;
  const imp = props.importRow || props.selectedImport || props.row || null;
  const onClose = props.onClose || (() => {});
  const externalItems = props.items || null;
  const productIndex = props.productIndex || {};

  if (!isOpen || !imp) return null;

  // Siempre cargamos import_items para mantener compatibilidad cuando no nos pasan `items`.
  const { rows: allImportItems = [], loading } = useSheet(
    "import_items",
    mapImportItems
  );

  // Si no nos pasaron `items` desde el padre, filtramos localmente por shipment/oci/po
  const fallbackFiltered = useMemo(() => {
    if (!allImportItems?.length) return [];
    const list = [];

    const sid = String(imp.shipmentId || "");
    const oci = String(imp.ociNumber || "");
    const po  = String(imp.poNumber || "");

    for (const r of allImportItems) {
      // prioridad: shipmentId -> ociNumber -> poNumber
      if (sid && String(r.shipmentId || "") === sid) {
        list.push(r);
        continue;
      }
      if (oci && String(r.ociNumber || "") === oci) {
        list.push(r);
        continue;
      }
      if (po && String(r.poNumber || "") === po) {
        list.push(r);
      }
    }
    return list;
  }, [allImportItems, imp?.shipmentId, imp?.ociNumber, imp?.poNumber]);

  // Base de ítems a usar en el drawer
  const baseItems = externalItems ?? fallbackFiltered;

  // Enriquecer con productName y packageUnits desde productIndex,
  // y asegurar al menos 2 decimales en unit price.
  const items = useMemo(() => {
    const toNumber = _utils?.toNumber ?? ((v) => (v == null || v === "" ? 0 : Number(v)));
    return (baseItems || []).map((it) => {
      const meta = productIndex[it.presentationCode] || {};
      const unit = toNumber(it.unitPrice);
      return {
        ...it,
        productName: meta.productName || "",
        packageUnits: meta.packageUnits ?? "",
        unitPriceFixed: unit.toFixed(2),
      };
    });
  }, [baseItems, productIndex]);

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay para cerrar */}
      <div className="absolute inset-0 bg-background/60" onClick={onClose} />

      <aside
        className="absolute right-0 top-0 h-full w-full max-w-2xl bg-card border-l shadow-xl flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">Import Details</h3>
            <p className="text-sm text-muted-foreground">
              {imp.shipmentId ? (
                <>
                  Shipment:&nbsp;<span className="font-medium">{imp.shipmentId}</span>
                </>
              ) : null}
              {imp.ociNumber ? (
                <>
                  &nbsp;·&nbsp;OCI:&nbsp;<span className="font-medium">{imp.ociNumber}</span>
                </>
              ) : null}
              {imp.poNumber ? (
                <>
                  &nbsp;·&nbsp;PO:&nbsp;<span className="font-medium">{imp.poNumber}</span>
                </>
              ) : null}
            </p>
          </div>
          <Button variant="ghost" iconName="X" onClick={onClose} />
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-auto">
          <ImportDetails
            items={items}
            loading={loading && !externalItems} // si vienen de fuera, ignoramos el loading interno
            importRow={imp}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </aside>
    </div>
  );
}
