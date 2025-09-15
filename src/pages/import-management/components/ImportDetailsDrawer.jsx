// src/pages/import-management/components/ImportDetailsDrawer.jsx
import React, { useMemo } from "react";
import Button from "@/components/ui/Button";
import { useSheet } from "@/lib/sheetsApi";
import { mapImportItems } from "@/lib/adapters";
import { usePresentationCatalog } from "@/lib/catalog";

// Helpers robustos para leer campos con nombres distintos
const pick = (obj, keys) => {
  if (!obj) return "";
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== "") {
      return String(obj[k]).trim();
    }
  }
  return "";
};
const eq = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

export default function ImportDetailsDrawer(props) {
  const isOpen = props.isOpen ?? props.open ?? false;
  const imp = props.importRow || props.selectedImport || props.row || null;
  const onClose = props.onClose || (() => {});
  if (!isOpen || !imp) return null;

  // Items desde la hoja
  const { rows: allImportItems = [], loading } = useSheet("import_items", mapImportItems);

  // Claves posibles por tipo
  const SHIPMENT_KEYS = ["shipmentId","shipment_id","shipmentID","ShipmentID","Shipment Id","Shipment ID","shipment","shipment_idm"];
  const OCI_KEYS      = ["ociNumber","oci_number","oci","OCI","OCI Number","OCI_Number","ociId","oci_id"];
  const PO_KEYS       = ["poNumber","po_number","po","PO","PO Number","PO_Number","poId","po_id"];

  // Identificadores del import abierto
  const sid = pick(imp, SHIPMENT_KEYS);
  const oci = pick(imp, OCI_KEYS);
  const po  = pick(imp, PO_KEYS);

  // Filtrado por prioridad: shipmentId → ociNumber → poNumber
  const filtered = useMemo(() => {
    const list = [];
    for (const r of allImportItems || []) {
      const rSid = pick(r, SHIPMENT_KEYS);
      const rOci = pick(r, OCI_KEYS);
      const rPo  = pick(r, PO_KEYS);

      if (sid) {
        if (rSid && eq(rSid, sid)) list.push(r);
        continue; // si buscamos por shipment, no seguimos con oci/po
      }
      if (oci) {
        if (rOci && eq(rOci, oci)) list.push(r);
        continue;
      }
      if (po) {
        if (rPo && eq(rPo, po)) list.push(r);
        continue;
      }
    }
    return list;
  }, [allImportItems, sid, oci, po]);

  // Enriquecer con maestro para product_name y package_units
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
              {sid ? <>Shipment: <span className="font-medium">{sid}</span> · </> : null}
              {oci ? <>OCI: <span className="font-medium">{oci}</span> · </> : null}
              {po  ? <>PO: <span className="font-medium">{po}</span></> : null}
            </p>
          </div>
          <Button variant="ghost" iconName="X" onClick={onClose} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="px-6 py-4">
            <h4 className="text-sm font-semibold mb-2">Items & Lots</h4>
            <div className="rounded-lg border divide-y">
              {(items || []).map((it, idx) => (
                <div key={idx} className="px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">
                        {it.presentationCode}{" "}
                        <span className="text-muted-foreground">
                          • {it.productName || "—"}{" "}
                          {it.packageUnits ? `• ${it.packageUnits} units/pack` : ""}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Lot: {it.lot || "—"} · OCI: {pick(it, OCI_KEYS) || "—"}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      Qty: {Number(it.qty || 0).toLocaleString("es-CL")}<br />
                      Unit:{" "}
                      {it.unitPrice != null
                        ? Number(it.unitPrice).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : "—"}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="px-4 py-4 text-sm text-muted-foreground">Loading items…</div>
              )}
              {!loading && (items || []).length === 0 && (
                <div className="px-4 py-4 text-sm text-muted-foreground">
                  No items found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </aside>
    </div>
  );
}
