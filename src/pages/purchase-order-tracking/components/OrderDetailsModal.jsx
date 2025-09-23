// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import React from "react";
import { useSheet } from "@/lib/sheetsApi";
import {
  mapPurchaseOrderItems,
  mapImportItems,
} from "@/lib/adapters";
import { usePresentationCatalog } from "@/lib/catalog";
// Importaciones correctas de Dialog y Button
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/* Formateador USD */
const fmtUSD = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n || 0);

/* Badge con colores para estados de fabricación */
const mfBadge = (status) => {
  const s = (status || "").toLowerCase();
  const colors = {
    pending: "bg-orange-100 text-orange-700",
    "in process": "bg-yellow-100 text-yellow-700",
    ready: "bg-blue-100 text-blue-700",
    shipped: "bg-purple-100 text-purple-700",
    cancelled: "bg-red-100 text-red-700",
    complete: "bg-green-100 text-green-700",
  };
  const color = colors[s] || "bg-gray-100 text-gray-700";
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}
    >
      {status || "—"}
    </span>
  );
};

/* Badge con colores para tipos de transporte */
const transportBadge = (type) => {
  const s = (type || "").toLowerCase();
  const colors = {
    air: "bg-cyan-100 text-cyan-700",
    sea: "bg-blue-100 text-blue-700",
    road: "bg-green-100 text-green-700",
  };
  const color = colors[s] || "bg-gray-100 text-gray-700";
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}
    >
      {type || "—"}
    </span>
  );
};

export default function OrderDetailsModal({ open, onClose, order }) {
  // Cargar líneas de la orden y partidas importadas
  const { rows: poItems = [] } = useSheet(
    "purchase_order_items",
    mapPurchaseOrderItems
  );
  const { rows: importItems = [] } = useSheet(
    "import_items",
    mapImportItems
  );
  const { enrich } = usePresentationCatalog();

  // Agrupar productos por código y calcular solicitados/importados/restantes
  const items = React.useMemo(() => {
    const bySku = {};
    enrich(
      poItems.filter((it) => it.poNumber === order.poNumber)
    ).forEach((it) => {
      const key = it.presentationCode;
      if (!bySku[key]) {
        bySku[key] = {
          presentationCode: it.presentationCode,
          productName: it.productName,
          packageUnits: it.packageUnits,
          unitPrice: it.unitPrice,
          requestedQty: it.qty,
          importedQty: 0,
          remainingQty: it.qty,
        };
      }
    });

    importItems
      .filter((imp) => imp.poNumber === order.poNumber)
      .forEach((imp) => {
        const key = imp.presentationCode;
        if (bySku[key]) {
          bySku[key].importedQty += imp.qty;
          bySku[key].remainingQty = Math.max(
            bySku[key].requestedQty - bySku[key].importedQty,
            0
          );
        }
      });

    return Object.values(bySku);
  }, [poItems, importItems, enrich, order.poNumber]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Order Details – {order.poNumber}
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            Tender Ref: {order.tenderRef}
          </div>
        </DialogHeader>

        {/* Información general */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Manufacturing
            </div>
            {mfBadge(order.manufacturingStatus)}
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Transport
            </div>
            {transportBadge(order.transportType)}
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Created
            </div>
            {order.createdDate
              ? new Date(order.createdDate).toLocaleDateString("es-CL")
              : "—"}
          </div>
        </div>

        {/* Lista de productos */}
        <div className="mt-6">
          <h4 className="font-semibold mb-4">
            Products in PO
          </h4>
          <div className="space-y-4">
            {items.map((it) => (
              <div
                key={it.presentationCode}
                className="p-4 border border-gray-200 rounded-lg flex justify-between items-start"
              >
                <div>
                  <div className="font-medium">
                    {it.presentationCode} &bull; {it.productName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {it.packageUnits} units/pack
                  </div>
                  {/* Cajas Requested/Imported/Remaining */}
                  <div className="flex space-x-2 mt-2">
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-2">
                      <div className="text-xxs uppercase text-muted-foreground">
                        Requested
                      </div>
                      <div className="font-semibold text-sm">
                        {it.requestedQty}
                      </div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-2">
                      <div className="text-xxs uppercase text-muted-foreground">
                        Imported
                      </div>
                      <div className="font-semibold text-sm">
                        {it.importedQty}
                      </div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-2">
                      <div className="text-xxs uppercase text-muted-foreground">
                        Remaining
                      </div>
                      <div className="font-semibold text-sm">
                        {it.remainingQty}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Costo unitario */}
                <div className="flex flex-col items-end">
                  <div className="text-xxs text-muted-foreground">
                    Unit
                  </div>
                  <div className="font-semibold text-sm">
                    {fmtUSD(it.unitPrice)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sección de comunicaciones */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold">
              Communications
            </h4>
            <Button size="sm" variant="outline">
              New Communication
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            No communications.
          </div>
        </div>

        {/* Botón cerrar */}
        <div className="mt-6 text-right">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

