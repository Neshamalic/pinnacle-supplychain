// src/pages/import-management/components/ImportDetailsDrawer.jsx
import React, { useMemo } from "react";
import Icon from "@/components/AppIcon";
import Button from "@/components/ui/Button";

const Badge = ({ children }) => (
  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
    {children}
  </span>
);

export default function ImportDetailsDrawer({ shipment, items = [], onClose }) {
  // Agrupación: OCI → PO → Producto → Lotes
  const tree = useMemo(() => {
    const t = {};
    for (const it of items) {
      const oci = it.ociNumber || "—";
      const po = it.poNumber || "—";
      const prod = it.productCode || "—";
      if (!t[oci]) t[oci] = {};
      if (!t[oci][po]) t[oci][po] = {};
      if (!t[oci][po][prod]) t[oci][po][prod] = [];
      t[oci][po][prod].push(it);
    }
    return t;
  }, [items]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-xl bg-card border-l border-border h-full overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Import Details</h3>
            <p className="text-sm text-muted-foreground">Shipment ID: {shipment?.id}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" />
          </Button>
        </div>

        {/* Top info */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div><div className="text-muted-foreground">Arrival Date</div>
            <div>{shipment?.arrivalDate ? new Date(shipment.arrivalDate).toLocaleDateString("es-CL") : "—"}</div>
          </div>
          <div><div className="text-muted-foreground">Transport</div><div className="capitalize">{shipment?.transportType || "—"}</div></div>
          <div><div className="text-muted-foreground">Import Status</div><div className="capitalize">{shipment?.importStatus || "—"}</div></div>
          <div><div className="text-muted-foreground">Total Cost (CLP)</div>
            <div>{new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(shipment?.totalCostClp || 0)}</div>
          </div>
        </div>

        {/* Items */}
        <h4 className="font-medium mb-2">Items</h4>
        {Object.keys(tree).length === 0 && (
          <div className="text-sm text-muted-foreground">No items for this import.</div>
        )}

        <div className="space-y-4">
          {Object.entries(tree).map(([oci, poGroup]) => (
            <div key={oci} className="border border-border rounded-lg">
              <div className="px-4 py-2 bg-muted text-sm font-medium">OCI: {oci}</div>
              <div className="p-4 space-y-4">
                {Object.entries(poGroup).map(([po, prodGroup]) => (
                  <div key={po} className="border border-border rounded-md">
                    <div className="px-3 py-2 text-sm bg-background">PO: {po}</div>
                    <div className="p-3 space-y-3">
                      {Object.entries(prodGroup).map(([prod, lots]) => (
                        <div key={prod}>
                          <div className="text-sm font-medium mb-1">Product: {prod}</div>
                          <div className="space-y-1">
                            {lots.map((lot, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm border border-dashed border-border rounded px-3 py-2">
                                <div className="flex flex-col">
                                  <span>Lot: {lot.lotNumber || "—"}</span>
                                  <span className="text-muted-foreground">Qty: {lot.qty ?? 0} • {lot.currency} {lot.unitPrice ?? 0}</span>
                                </div>
                                <Badge>{lot.qcStatus || "—"}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
