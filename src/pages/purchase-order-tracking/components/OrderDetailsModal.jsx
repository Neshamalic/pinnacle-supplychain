// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import { formatCurrency, formatDate } from "@/lib/utils";
import { fetchJSON, postJSON, API_BASE } from "@/lib/utils";
import CommunicationList from "@/components/CommunicationList"; // ya existe en tu repo

/* ---------------- utils “for dummies” ---------------- */
function parseMoney(input) {
  // Acepta "1,14" o "1.14" y devuelve Number con 2 decimales
  if (input == null || input === "") return null;
  const s = String(input).replace(/\s/g, "").replace(",", ".");
  const n = Number.parseFloat(s);
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100) / 100;
}
function parseIntSafe(v) {
  const n = Number.parseInt(String(v || "").replace(/\D+/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

/* ---------------- API helpers (filtros por PO) ---------------- */
async function getPoHeader(poNumber) {
  // tu Apps Script devuelve purchase_orders; usamos filtro por po
  const url = `${API_BASE}?route=table&name=purchase_orders&po=${encodeURIComponent(poNumber)}`;
  const json = await fetchJSON(url);
  return Array.isArray(json?.rows) ? json.rows : [];
}

async function getPoItems(poNumber) {
  // Como juntaste items dentro de purchase_orders, los “items” son esas filas
  const url = `${API_BASE}?route=table&name=purchase_orders&po=${encodeURIComponent(poNumber)}`;
  const json = await fetchJSON(url);
  return Array.isArray(json?.rows) ? json.rows : [];
}

async function updatePoItem(poNumber, presentationCode, patch) {
  // Upsert por llaves: po_number + presentation_code (configurado en tu App Script)
  const row = {
    po_number: poNumber,
    presentation_code: presentationCode,
    ...patch,
  };
  const url = `${API_BASE}?route=write&action=update&name=purchase_orders`;
  return postJSON(url, { row });
}

/* ---------------- Modal de edición (sin window.prompt) ---------------- */
function EditItemModal({ open, onClose, item, onSaved }) {
  const [price, setPrice] = useState(item?.unit_price_usd ?? "");
  const [qty, setQty] = useState(item?.total_qty ?? "");

  useEffect(() => {
    if (open) {
      setPrice(item?.unit_price_usd ?? "");
      setQty(item?.total_qty ?? "");
    }
  }, [open, item]);

  if (!open) return null;

  async function handleSave() {
    const cost = parseMoney(price);
    const totalQty = parseIntSafe(qty);

    // Envia sólo lo que el usuario cambió
    const patch = {};
    if (cost != null) patch.unit_price_usd = cost;
    if (totalQty != null) patch.total_qty = totalQty;

    if (!patch.unit_price_usd && !patch.total_qty && patch.total_qty !== 0) {
      onClose();
      return;
    }

    try {
      await updatePoItem(item.po_number, item.presentation_code, patch);
      onSaved?.();
      onClose();
    } catch (e) {
      alert("No se pudo guardar: " + String(e?.message || e));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-[520px] rounded-xl bg-white p-5 shadow-xl">
        <div className="text-lg font-semibold mb-4">Edit item</div>

        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            <div><b>PO:</b> {item.po_number}</div>
            <div><b>Code:</b> {item.presentation_code}</div>
            <div><b>Product:</b> {item.product_name || "—"}</div>
          </div>

          <label className="block">
            <div className="text-sm mb-1">Unit price (USD)</div>
            <input
              className="w-full rounded-md border px-3 py-2"
              placeholder="Ej: 1.14 (acepta , o .)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>

          <label className="block">
            <div className="text-sm mb-1">Total qty</div>
            <input
              className="w-full rounded-md border px-3 py-2"
              placeholder="Ej: 4560"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button iconName="Save" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Modal principal ---------------- */
export default function OrderDetailsModal({ poNumber, ociNumber, onClose }) {
  const title = useMemo(() => {
    const left = ociNumber ? String(ociNumber).replace(/^OCI-?/i, "OCI-") : "";
    const right = poNumber ? String(poNumber).replace(/^PO-?/i, "PO-") : "";
    return `Order Details — ${left}${left && right ? " / " : ""}${right}`;
  }, [poNumber, ociNumber]);

  const [header, setHeader] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);

  async function refetch() {
    setLoading(true);
    try {
      const [h, it] = await Promise.all([
        getPoHeader(poNumber),
        getPoItems(poNumber), // ya viene filtrado en el backend → carga rápido
      ]);
      // Si tu hoja tiene una sola fila “header” por PO, intenta tomar la primera
      setHeader(h?.[0] || null);
      setItems(it || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refetch(); }, [poNumber]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 overflow-y-auto">
      <div className="mt-8 mb-8 w-[1100px] rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="text-xl font-semibold">{title}</div>
          <div className="text-sm text-muted-foreground">
            Created: {header?.created_date ? formatDate(header.created_date) : "—"}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="mb-4 flex gap-6 border-b">
            <button className="pb-3 border-b-2 border-primary text-primary font-medium">
              Items
            </button>
            <button className="pb-3 text-muted-foreground hover:text-foreground">
              Communications
            </button>
          </div>

          {/* Top cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-lg bg-muted/30 p-4">
              <div className="text-xs text-muted-foreground">PO Number</div>
              <div className="text-lg font-medium">{poNumber}</div>
            </div>
            <div className="rounded-lg bg-muted/30 p-4">
              <div className="text-xs text-muted-foreground">Created</div>
              <div className="text-lg font-medium">
                {header?.created_date ? formatDate(header.created_date) : "—"}
              </div>
            </div>
            <div className="rounded-lg bg-muted/30 p-4">
              <div className="text-xs text-muted-foreground">Total (USD)</div>
              <div className="text-lg font-medium">
                {formatCurrency(header?.total_usd || 0)}
              </div>
            </div>
          </div>

          {/* Items list */}
          <div className="rounded-xl border">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading…</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No items found.</div>
            ) : (
              <ul className="divide-y">
                {items.map((it) => (
                  <li key={`${it.po_number}-${it.presentation_code}`} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="font-medium">
                          {it.product_name || it.presentation_name || it.presentation_code}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Code: {it.presentation_code} • {it.transport_type || "—"} • {it.oci_number || ociNumber || "—"}
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-3">
                          <div>
                            <div className="text-xs text-muted-foreground">Requested</div>
                            <div className="font-medium">{it.requested_qty || it.requested || "—"}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Imported</div>
                            <div className="font-medium">{it.imported_qty || it.imported || "—"}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Remaining</div>
                            <div className="font-medium">{it.remaining_qty || it.remaining || "—"}</div>
                          </div>
                        </div>
                      </div>

                      <div className="w-48 shrink-0">
                        <div className="text-xs text-muted-foreground">Unit price</div>
                        <div className="font-medium">{formatCurrency(it.unit_price_usd || 0)}</div>
                        <Button
                          className="mt-3"
                          size="sm"
                          variant="secondary"
                          onClick={() => setEditItem(it)}
                          iconName="Pencil"
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Communications (usa el mismo componente que el resto) */}
          <div className="mt-8">
            <div className="text-base font-semibold mb-3">Communications</div>
            <CommunicationList linkedType="orders" linkedId={poNumber} />
          </div>

          {/* Footer */}
          <div className="flex justify-end py-6">
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>

      {/* Modal de edición */}
      <EditItemModal
        open={!!editItem}
        item={editItem}
        onClose={() => setEditItem(null)}
        onSaved={refetch}
      />
    </div>
  );
}
