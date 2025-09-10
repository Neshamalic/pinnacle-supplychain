// src/pages/import-management/components/ImportDetailsDrawer.jsx
import React, { useMemo } from "react";
import Button from "@/components/ui/Button";
import { useSheet } from "@/lib/sheetsApi";
import { mapImportItems } from "@/lib/adapters";
import { usePresentationCatalog } from "@/lib/catalog";
import ImportDetails from "./ImportDetails";

/**
 * Drawer que muestra el detalle de un import (items por OCI/PO).
 * Props esperadas (cualquiera de estas variantes funciona):
 * - isOpen, onClose, importRow
 * - isOpen, onClose, selectedImport
 * - open, onClose, row
 */
export default function ImportDetailsDrawer(props) {
  const isOpen =
    props.isOpen ?? props.open ?? false;
  const imp =
    props.importRow || props.selectedImport || props.row || null;

  const onClose = props.onClose || (() => {});

  if (!isOpen || !imp) return null;

  // 1) Items de import desde Google Sheets
  const { rows: allImportItems = [], loading } = useSheet(
    "import_items",
    mapImportItems
  );

  // 2) Filtramos por oci_number (y opcionalmente por po_number si aplica)
  const filtered = useMemo(() => {
    const list = [];
    for (const r of allImportItems || []) {
      if (imp.ociNumber && r.ociNumber === imp.ociNumber) list.push(r);
      else if (imp.poNumber && r.poNumber === imp.poNumber) list.push(r);
    }
    return list;
  }, [allImportItems, imp?.ociNumber, imp?.poNumber]);

  // 3) Enriquecemos con product_name y package_units
  const { enrich } = usePresentationCatalog();
  const items = useMemo(() => enrich(filtered), [filtered, enrich]);

  // Drawer UI
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-background/60"
        onClick={onClose}
      />
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
              {imp.shipmentId ? <>Shipment: <span className="font-medium">{imp.shipmentId}</span> · </> : null}
              {imp.ociNumber ? <>OCI: <span className="font-medium">{imp.ociNumber}</span> · </> : null}
              {imp.poNumber ? <>PO: <span className="font-medium">{imp.poNumber}</span></> : null}
            </p>
          </div>
          <Button variant="ghost" iconName="X" onClick={onClose} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <ImportDetails
            items={items}
            loading={loading}
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
