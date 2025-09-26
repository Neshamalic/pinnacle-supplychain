// src/pages/purchase-order-tracking/components/OrderItemEditModal.jsx
import React, { useEffect, useState } from "react";
import Icon from "@/components/AppIcon";
import { API_BASE, postJSON } from "@/lib/utils";

function Shell({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative mx-auto mt-12 w-full max-w-lg rounded-2xl bg-white shadow-xl">
        {children}
      </div>
    </div>
  );
}

export default function OrderItemEditModal({ open, onClose, line, onSaved }) {
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    if (!open) return;
    setQty(String(line?.totalQty ?? line?.total_qty ?? ""));
    setPrice(String(line?.unitPriceUsd ?? line?.unit_price_usd ?? ""));
  }, [open, line]);

  const toNumberSafe = (v) => {
    // acepta 1,14 o 1.14; quita separadores de miles
    const s = String(v || "").replace(/\./g, "").replace(",", ".");
    const num = parseFloat(s);
    return Number.isFinite(num) ? num : 0;
  };

  async function handleSave() {
    if (!line?.poNumber || !line?.presentationCode) return;

    const row = {
      // claves de upsert que tu Apps Script espera
      po_number: line.poNumber,
      presentation_code: line.presentationCode,
      // campos editables
      total_qty: toNumberSafe(qty),
      unit_price_usd: toNumberSafe(price),
    };

    await postJSON(`${API_BASE}?route=write&action=update&name=purchase_orders`, { row });
    onSaved?.();
    onClose();
  }

  return (
    <Shell open={open} onClose={onClose}>
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Edit line</h3>
          <button className="rounded-lg p-2 hover:bg-slate-100" onClick={onClose}>
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">Total qty</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              className="rounded-lg border p-2"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Ej: 4560"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">Unit price (USD)</span>
            <input
              type="text" // text para permitir coma; luego normalizamos
              className="rounded-lg border p-2"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Ej: 1,14"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button className="rounded-lg border px-4 py-2" onClick={onClose}>
            Cancel
          </button>
          <button
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </Shell>
  );
}
