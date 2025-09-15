// src/pages/import-management/components/ImportDetailsDrawer.jsx
import React, { useMemo } from "react";
import Button from "@/components/ui/Button";
import { useSheet } from "@/lib/sheetsApi";
import { mapImportItems } from "@/lib/adapters";
import { usePresentationCatalog } from "@/lib/catalog";
import ImportDetails from "./ImportDetails";

/**
 * Drawer para ver los items de un embarque/OCI/PO.
 * Acepta props en varias formas:
 *   - { isOpen, onClose, importRow }
 *   - { open, onClose, row }
 *   - { isOpen, onClose, selectedImport }
 */
export default function ImportDetailsDrawer(props) {
  const isOpen = props.isOpen ?? props.open ?? false;
  const imp =
    props.importRow || props.selectedImport || props.row || null;
  const onClose = props.onClose || (() => {});

  if (!isOpen || !imp) return null;

  // Utilidad: toma la 1ª clave no vacía y la normaliza a string
  const pick = (...vals) => {
    for (const v of vals) {
      if (v === 0) return "0";
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        return String(v).trim();
      }
    }
    return "";
  };

  // Normalizamos claves del "row" que abre el drawer
  const impOCI = pick(imp.ociNumber, imp.oci, imp.OCI, imp.oci_id);
  const impPO = pick(imp.poNumber, imp.po, imp.PO, imp.po_id);
  const impSHIP = pick(imp.shipmentId, imp.shipment_id, imp.shipment, imp.ShipmentId);

  // 1) Leemos todos los import_items desde Sheets
  const { rows: allImportItems = [], loading } = useSheet(
    "import_items",
    mapImportItems
  );

  // 2) Filtramos items por cualquiera de las llaves disponibles
  const filtered = useMemo(() => {
    const out = [];
    for (const r of allImportItems || []) {
      const rOCI = pick(r.ociNumber, r.oci, r.OCI, r.oci_id);
      const rPO = pick(r.poNumber, r.po, r.PO, r.po_id);
      const rSHIP = pick(r.shipmentId, r.shipment_id, r.shipment, r.ShipmentId);

      const matchByOCI = impOCI && rOCI && rOCI === impOCI;
      const matchByPO = impPO && rPO && rPO === impPO;
      const matchByShip = impSHIP && rSHIP && rSHIP === impSHIP;

      if (matchByOCI || matchByPO || matchByShip) out.push(r);
    }
    return out;
  }, [allImportItems, impOCI, impPO, impSHIP]);

  // 3) Enriquecemos con maestro para mostrar product_name y package_units
  const { enrich } = usePresentationCatalog();
  const items = useMemo(() => enrich(filtered), [filtered, enrich]);

  return (
    <div className="fixed inset-0 z-50">
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
              {impSHIP ? <>Shipment: <span className="font-medium">{impSHIP}</span>{impOCI || impPO ? " · " : ""}</> : null}
              {impOCI ? <>OCI: <span className="font-medium">{impOCI}</span>{impPO ? " · " : ""}</> : null}
              {impPO ? <>PO: <span className="font-medium">{impPO}</span></> : null}
            </p>
          </div>
          <Button variant="ghost" iconName="X" onClick={onClose} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <ImportDetails items={items} loading={loading} importRow={imp} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </aside>
    </div>
  );
}
