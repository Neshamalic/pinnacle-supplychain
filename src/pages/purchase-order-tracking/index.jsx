// src/pages/purchase-order-tracking/index.jsx
import React, { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { useSheet } from "@/lib/sheetsApi";
import { mapPurchaseOrders } from "@/lib/adapters";
import OrderDetailsModal from "./components/OrderDetailsModal.jsx"; // 👈 tu modal de View
// Si tienes un drawer/modal de edición diferente, importa aquí:
// import OrderEditModal from "./components/OrderEditModal.jsx";

export default function PurchaseOrderTracking() {
  const { rows: allPos = [], loading, error, reload } = useSheet("purchase_orders", mapPurchaseOrders);

  const [selected, setSelected] = useState(null);
  const [openView, setOpenView] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  const rows = useMemo(() => allPos || [], [allPos]);

  const onClickView = (row) => {
    setSelected(row);
    setOpenView(true);
  };
  const onClickEdit = (row) => {
    setSelected(row);
    setOpenEdit(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Purchase Order Tracking</h1>
          <p className="text-sm text-muted-foreground">
            Monitor production status and shipment coordination for orders to India
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={reload}>Export</Button>
          <Button>New Order</Button>
        </div>
      </div>

      {/* Filtros (placeholder – conserva los tuyos si los tienes) */}
      <div className="rounded-lg border p-4">
        <div className="text-sm text-muted-foreground">Filters</div>
      </div>

      <div className="text-sm text-muted-foreground flex items-center gap-2">
        Last updated: just now
      </div>

      {/* Tabla simple (usa tu tabla real si prefieres) */}
      <div className="rounded-lg border overflow-hidden">
        <div className="grid grid-cols-6 gap-0 px-4 py-3 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
          <div>PO Number</div>
          <div>Tender Ref</div>
          <div>Manufacturing</div>
          <div>QC</div>
          <div>Cost (USD)</div>
          <div className="text-right">Actions</div>
        </div>

        {loading && (
          <div className="px-4 py-6 text-sm text-muted-foreground">Loading…</div>
        )}
        {!loading && rows.length === 0 && (
          <div className="px-4 py-6 text-sm text-muted-foreground">No purchase orders found.</div>
        )}
        {rows.map((r) => (
          <div key={r.id || r.poNumber} className="grid grid-cols-6 gap-0 px-4 py-3 border-b text-sm">
            <div className="font-medium">{r.poNumber}</div>
            <div>{r.tenderRef || "—"}</div>
            <div className="capitalize">{r.manufacturingStatus || "—"}</div>
            <div className="capitalize">{r.qcStatus || "—"}</div>
            <div>{r.costUsd ? `USD ${Number(r.costUsd).toLocaleString("en-US")}` : "—"}</div>
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => { e.stopPropagation(); onClickView(r); }}
              >
                View
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => { e.stopPropagation(); onClickEdit(r); }}
              >
                Edit
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* View */}
      {openView && selected && (
        <OrderDetailsModal
          open={openView}
          onClose={() => { setOpenView(false); setSelected(null); }}
          order={selected}
        />
      )}

      {/* Edit (si tienes componente de edición, descomenta) */}
      {/* {openEdit && selected && (
        <OrderEditModal
          open={openEdit}
          onClose={() => { setOpenEdit(false); setSelected(null); }}
          order={selected}
          onSaved={reload}
        />
      )} */}
    </div>
  );
}
