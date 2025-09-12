// src/pages/import-management/components/ImportDetailsDrawer.jsx
import React, { useMemo } from "react";
import Button from "@/components/ui/Button";
import { useSheet } from "@/lib/sheetsApi";
import { mapImportItems } from "@/lib/adapters";
import { usePresentationCatalog } from "@/lib/catalog";

export default function ImportDetailsDrawer(props) {
  const isOpen = props.isOpen ?? props.open ?? false;
  const imp = props.importRow || props.selectedImport || props.row || null;
  const onClose = props.onClose || (() => {});

  if (!isOpen || !imp) return null;

  // 1) Import items desde la hoja
  const { rows: allImportItems = [], loading } = useSheet("import_items", mapImportItems);

  // 2) Filtrado por prioridad: shipmentId -> ociNumber -> poNumber
  const filtered = useMemo(() => {
    const list = [];
    const sid = imp.shipmentId || imp.shipment_id || imp.shipmentID;
    const oci = imp.ociNumber || imp.oci;
    const po = imp.poNumber || imp.po;
    for (const r of allImportItems || []) {
      if (sid && (r.shipmentId === sid || r.shipment_id === sid)) {
        list.push(r);
        continue;
      }
      if (!sid && oci && r.ociNumber === oci) {
        list.push(r);
        continue;
      }
      if (!sid && !oci && po && r.poNumber === po) {
        list.push(r);
        continue;
      }
    }
    return list;
  }, [allImportItems, imp]);

  // 3) Enriquecer con product master (product_name, package_units)
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
              {imp.shipmentId ? <>Shipment: <span className="font-medium">{imp.shipmentId}</span> · </> : null}
              {imp.ociNumber ? <>OCI: <span className="font-medium">{imp.ociNumber}</span> · </> : null}
              {imp.poNumber ? <>PO: <span className="font-medium">{imp.poNumber}</span></> : null}
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
                        Lot: {it.lot || "—"} · OCI: {it.ociNumber || "—"}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      Qty: {Number(it.qty || 0).toLocaleString("es-CL")}<br />
                      Unit: {it.unitPrice ? Number(it.unitPrice).toLocaleString("en-US", { minimumFractionDigits: 2 }) : "—"}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="px-4 py-4 text-sm text-muted-foreground">Loading items…</div>
              )}
              {!loading && (items || []).length === 0 && (
                <div className="px-4 py-4 text-sm text-muted-foreground">No items found.</div>
              )}
            </div>
          </div>
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
