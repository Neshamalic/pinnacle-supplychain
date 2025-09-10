// src/pages/purchase-order-tracking/components/OrdersTable.jsx
import React, { useMemo, useState } from "react";
import Icon from "@/components/AppIcon";
import Button from "@/components/ui/Button";
import OrderDetailsModal from "./OrderDetailsModal";

import { useSheet } from "@/lib/sheetsApi.js";
import { mapPurchaseOrders } from "@/lib/adapters.js";

const OrdersTable = ({ currentLanguage = "en", filters = {} }) => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("view");

  const { rows: orders = [], loading, error } = useSheet(
    "purchase_orders",
    mapPurchaseOrders
  );

  const t = (en, es) => (currentLanguage === "es" ? es : en);

  const formatCurrency0 = (amount, currency) => {
    const num = Number.isFinite(+amount) ? +amount : 0;
    return new Intl.NumberFormat(currentLanguage === "es" ? "es-CL" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  // 1) Filtro de búsqueda (solo por PO o Tender)
  const filtered = useMemo(() => {
    const s = (filters.search || "").toLowerCase();
    return (orders || []).filter((o) => {
      if (!s) return true;
      const po = (o.poNumber || "").toLowerCase();
      const tr = (o.tenderRef || "").toLowerCase();
      return po.includes(s) || tr.includes(s);
    });
  }, [orders, filters]);

  // 2) Agrupar por PO (evitar duplicados) y acumular costos
  const grouped = useMemo(() => {
    const m = new Map();
    for (const o of filtered) {
      const key = o.poNumber || o.id || "";
      if (!key) continue;
      const prev = m.get(key) || {
        id: o.id,
        poNumber: o.poNumber,
        tenderRef: o.tenderRef,
        costUsd: 0,
        costClp: 0,
        _sample: o, // para pasar el objeto al modal (manufacturingStatus, etc)
      };
      prev.costUsd += Number.isFinite(+o.costUsd) ? +o.costUsd : 0;
      prev.costClp += Number.isFinite(+o.costClp) ? +o.costClp : 0;
      m.set(key, prev);
    }
    // ordenar por PO
    return Array.from(m.values()).sort((a, b) =>
      String(a.poNumber).localeCompare(String(b.poNumber))
    );
  }, [filtered]);

  const openModal = (poRow, mode = "view") => {
    // reconstruimos un "order" mínimo para el modal
    const base = poRow?._sample || {};
    setSelectedOrder({
      id: poRow.id,
      poNumber: poRow.poNumber,
      tenderRef: poRow.tenderRef,
      manufacturingStatus: base.manufacturingStatus || "",
      qcStatus: base.qcStatus || "",
      transportType: base.transportType || "",
      eta: base.eta || "",
      costUsd: poRow.costUsd,
      costClp: poRow.costClp,
      createdDate: base.createdDate || "",
      _fromGroup: true,
    });
    setModalMode(mode);
    setIsModalOpen(true);
  };

  if (loading) return <div className="p-4">Loading orders…</div>;
  if (error) return <div className="p-4 text-red-600">Error: {String(error)}</div>;

  return (
    <>
      <div className="bg-card rounded-lg border border-border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-foreground">
                  {t("PO Number", "Número PO")}
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-foreground">
                  {t("Tender Ref", "Ref. Licitación")}
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-foreground">
                  {t("Cost (USD)", "Costo (USD)")}
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-foreground">
                  {t("Actions", "Acciones")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {grouped.map((row, idx) => (
                <tr key={row.id || row.poNumber || `r-${idx}`} className="hover:bg-muted/50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{row.poNumber || "—"}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{row.tenderRef || "—"}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{formatCurrency0(row.costUsd, "USD")}</div>
                    <div className="text-xs text-muted-foreground">{formatCurrency0(row.costClp, "CLP")}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openModal(row, "view")}
                        iconName="Eye"
                        iconPosition="left"
                      >
                        {t("View", "Ver")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openModal(row, "edit")}
                        iconName="Edit"
                        iconPosition="left"
                      >
                        {t("Edit", "Editar")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {grouped.length === 0 && (
                <tr>
                  <td className="px-6 py-10 text-center text-muted-foreground" colSpan={4}>
                    {t("No orders found", "No se encontraron órdenes")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && selectedOrder && (
        <OrderDetailsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          order={selectedOrder}
          mode={modalMode}
          currentLanguage={currentLanguage}
        />
      )}
    </>
  );
};

export default OrdersTable;
