// src/pages/purchase-order-tracking/components/EditOrderItemModal.jsx
import { useState } from "react";
import { updateRow } from "@/lib/sheetsApi";

export default function EditOrderItemModal({ item, poNumber, onClose, onSaved }) {
  const [costUsd, setCostUsd] = useState(item?.cost_usd ?? "");
  const [totalQty, setTotalQty] = useState(item?.total_qty ?? "");

  async function handleSave() {
    // Clave primaria: po_number + presentation_code (como en KEYS.purchase_orders)
    const payload = {
      po_number: poNumber,
      presentation_code: item?.presentation_code,
      cost_usd: costUsd === "" ? "" : Number(costUsd),
      total_qty: totalQty === "" ? "" : Number(totalQty),
    };
    await updateRow("purchase_orders", payload);
    onSaved?.();
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl">
        <h3 className="text-lg font-semibold">Edit item</h3>
        <p className="text-sm text-gray-500 mt-1">
          Code: <span className="font-mono">{item?.presentation_code}</span>
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm text-gray-600">Unit price (USD)</label>
            <input
              type="number"
              step="0.01"
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={costUsd}
              onChange={(e) => setCostUsd(e.target.value)}
              placeholder="1.89"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Total qty (requested)</label>
            <input
              type="number"
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={totalQty}
              onChange={(e) => setTotalQty(e.target.value)}
              placeholder="1000"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button className="px-4 py-2 rounded-xl border" onClick={onClose}>
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-xl bg-blue-600 text-white"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
