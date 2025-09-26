// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import { useSheet } from "@/lib/sheetsApi";
import { mapPurchaseOrders, mapImportItems, mapCommunications } from "@/lib/adapters";
import { formatCurrency, formatNumber, formatDate, API_BASE, postJSON } from "@/lib/utils";

/* =========================
   Modal contenedor reusable
   ========================= */
function Modal({ open, onClose, children, maxWidth = "max-w-5xl" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative mx-auto mt-10 w-full ${maxWidth} rounded-xl bg-white shadow-xl`}>
        {children}
      </div>
    </div>
  );
}

/* ======================================
   Editor de línea (qty + unit_price_usd)
   ====================================== */
function ItemEditModal({ open, onClose, line, onSaved }) {
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    if (open && line) {
      setQty(String(line.totalQty ?? line.total_qty ?? ""));
      setPrice(String(line.unitPriceUsd ?? line.unit_price_usd ?? ""));
    }
  }, [open, line]);

  function toNumberSafe(v) {
    // Acepta “1,14” o “1.14”
    const cleaned = String(v || "").replace(/\./g, "").replace(",", ".");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  }

  async function handleSave() {
    if (!line) return;
    const body = {
      // Llaves para "upsert" en Apps Script (tienen que coincidir con KEYS.purchase_orders)
      po_number: line.poNumber,
      presentation_code: line.presentationCode,
      // Campos modificables:
      total_qty: toNumberSafe(qty),
      unit_price_usd: toNumberSafe(price),
    };

    await postJSON(`${API_BASE}?route=write&action=update&name=purchase_orders`, { row: body });
    onSaved?.();
    onClose();
  }

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Edit line</h3>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">Total qty</span>
            <input
              type="number"
              min={0}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="rounded-lg border p-2"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">Unit price (USD)</span>
            <input
              type="text" // text para permitir coma, luego normalizamos
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="rounded-lg border p-2"
              placeholder="1.14"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border px-4 py-2">Cancel</button>
          <button onClick={handleSave} className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ==========================================
   Formulario completo de “New Communication”
   (mismo estilo que en Communications Log)
   ========================================== */
function CommunicationModal({ open, onClose, defaultLinked, onSaved }) {
  const [type, setType] = useState("meeting");
  const [subject, setSubject] = useState("");
  const [participants, setParticipants] = useState("");
  const [linkedType, setLinkedType] = useState(defaultLinked?.type || "orders");
  const [linkedId, setLinkedId] = useState(defaultLinked?.id || "");
  const [content, setContent] = useState("");

  useEffect(() => {
    setLinkedType(defaultLinked?.type || "orders");
    setLinkedId(defaultLinked?.id || "");
  }, [defaultLinked, open]);

  async function handleSave() {
    await postJSON(`${API_BASE}?route=write&name=communications&action=create`, {
      row: {
        type,
        subject,
        participants,
        linked_type: linkedType,
        linked_id: linkedId,
        content,
        unread: "true",
        created_date: new Date().toISOString(),
      },
    });
    onSaved?.();
    onClose();
  }

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-2xl">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">New Communication</h3>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">Type</span>
              <select value={type} onChange={(e)=>setType(e.target.value)} className="rounded-lg border p-2">
                <option value="meeting">Meeting</option>
                <option value="mail">Mail</option>
                <option value="call">Call</option>
                <option value="whatsapp">Whatsapp</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">Participants</span>
              <input
                value={participants}
                onChange={(e)=>setParticipants(e.target.value)}
                placeholder="Name1@…, Name2@…"
                className="rounded-lg border p-2"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">Subject</span>
            <input
              value={subject}
              onChange={(e)=>setSubject(e.target.value)}
              placeholder="Ej: Weekly review – Q4 tenders"
              className="rounded-lg border p-2"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">Linked Type</span>
              <select value={linkedType} onChange={(e)=>setLinkedType(e.target.value)} className="rounded-lg border p-2">
                <option value="orders">Orders</option>
                <option value="imports">Imports</option>
                <option value="tender">Tender</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">Linked ID</span>
              <input
                value={linkedId}
                onChange={(e)=>setLinkedId(e.target.value)}
                placeholder="PO-xxx / OCI-xxx / tender id"
                className="rounded-lg border p-2"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">Content</span>
            <textarea
              value={content}
              onChange={(e)=>setContent(e.target.value)}
              rows={6}
              className="w-full rounded-lg border p-2"
              placeholder="Escribe la nota, resumen de reunión, correo, etc."
            />
          </label>

          <div className="mt-2 text-xs text-slate-500">
            Linked: <b>{linkedType}</b> • <b>{linkedId}</b>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border px-4 py-2">Cancel</button>
          <button onClick={handleSave} className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ==========================
   Tarjeta de comunicación
   ========================== */
function CommCard({ c, onDelete }) {
  const isUnread = String(c.unread) === "true";
  const kind = (c.linked_type || "").toLowerCase();
  const kindLabel = kind === "tender" ? "Tender" : kind === "imports" ? "Imports" : "Orders";
  const [expanded, setExpanded] = useState(false);
  const text = String(c.content || c.preview || "");
  const short = text.length > 280 ? text.slice(0, 280) + "…" : text;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-base font-semibold text-slate-800">{c.subject || "(no subject)"}</div>
            {isUnread && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Unread</span>}
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">{kindLabel}</span>
          </div>
          <div className="text-xs text-slate-500">
            {(c.type || "").toLowerCase()} • {c.participants || ""} • {formatDate(c.created_date)}
          </div>
        </div>

        <button className="rounded-lg border px-3 py-1.5 text-rose-700 hover:bg-rose-50" onClick={() => onDelete?.(c)}>
          Delete
        </button>
      </div>

      <div className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">
        {expanded ? text : short}
        {text.length > 280 && (
          <button className="ml-2 text-xs text-indigo-600 underline" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>

      <div className="mt-3 text-xs text-slate-500">
        Linked: <b>{c.linked_type}</b> • <b>{c.linked_id}</b>
      </div>
    </div>
  );
}

/* ==========================
   Modal principal de Orden
   ========================== */
export default function OrderDetailsModal({ open, onClose, order }) {
  // Datos base
  const { rows: poRows = [] } = useSheet("purchase_orders", mapPurchaseOrders); // líneas/ítems de PO
  const { rows: impItems = [] } = useSheet("import_items", mapImportItems);     // si necesitás OCI por línea
  const { rows: comms = [], refetch: refetchComms } = useSheet("communications", mapCommunications);

  // Filtrar por esta orden
  const poNumber = order?.poNumber || order?.po_number || "";
  const ociNumber = order?.shipmentId || order?.ociNumber || order?.oci_number || "";
  const lines = useMemo(
    () => (poRows || []).filter((r) => r.poNumber === poNumber),
    [poRows, poNumber]
  );

  // Encabezado limpio: “OCI-171 / PO-171” (una sola vez)
  const headerLeft = [ociNumber && `OCI-${ociNumber}`.replace(/^OCI-OCI-/i, "OCI-"), poNumber].filter(Boolean).join(" / ");

  // States auxiliares
  const [editing, setEditing] = useState(null);
  const [commOpen, setCommOpen] = useState(false);

  // Comunicaciones vinculadas a este PO
  const commsForOrder = useMemo(
    () => (comms || []).filter((c) => String(c.linked_type).toLowerCase() === "orders" && String(c.linked_id) === poNumber),
    [comms, poNumber]
  );

  // Totales
  const sum = (arr, getter) => arr.reduce((acc, r) => acc + (Number(getter(r)) || 0), 0);
  const totalQty = sum(lines, (r) => r.totalQty ?? r.total_qty);
  const totalUsd = sum(lines, (r) => (r.unitPriceUsd ?? r.unit_price_usd) * (r.totalQty ?? r.total_qty));

  return (
    <Modal open={open} onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between border-b p-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Order Details — {headerLeft}</h2>
          <div className="text-xs text-muted-foreground">
            Created: {formatDate(order?.created_date)}
          </div>
        </div>
        <button className="rounded-lg p-2 hover:bg-slate-100" onClick={onClose}>
          <Icon name="X" size={18} />
        </button>
      </div>

      {/* Tabs muy simples */}
      <div className="px-6 pt-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <InfoTile label="PO Number" value={poNumber || "—"} />
          <InfoTile label="Created" value={formatDate(order?.created_date) || "—"} />
          <InfoTile label="Total (USD)" value={formatCurrency(totalUsd)} />
        </div>

        <div className="mt-6 rounded-xl border">
          <div className="border-b p-4 font-medium">Products</div>
          <div className="divide-y">
            {(lines || []).length === 0 && (
              <div className="p-8 text-center text-slate-500">No items found.</div>
            )}
            {lines.map((line, i) => {
              const requested = Number(line.totalQty ?? line.total_qty) || 0;
              const price = Number(line.unitPriceUsd ?? line.unit_price_usd) || 0;
              const imported = Number(line.imported || 0);
              const remaining = Math.max(requested - imported, 0);
              return (
                <div key={i} className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium text-slate-800">{line.productName || line.presentationCode}</div>
                    <div className="text-xs text-slate-500">code: {line.presentationCode}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <InfoTile label="Requested" value={formatNumber(requested)} />
                    <InfoTile label="Imported" value={formatNumber(imported)} />
                    <InfoTile label="Remaining" value={formatNumber(remaining)} />
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm text-slate-500">{formatCurrency(price)} <span className="text-xs">/ unit</span></div>
                    <button className="mt-2 rounded-lg border px-3 py-1.5 text-slate-700 hover:bg-slate-50" onClick={() => setEditing(line)}>
                      Edit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Communications */}
        <div className="mt-8 rounded-xl border">
          <div className="flex items-center justify-between border-b p-4">
            <div className="font-medium">Communications</div>
            <Button onClick={() => setCommOpen(true)} iconName="Plus">Add</Button>
          </div>

          <div className="divide-y">
            {(commsForOrder || []).length === 0 && (
              <div className="p-8 text-center text-slate-500">No communications yet.</div>
            )}
            {commsForOrder.map((c, i) => (
              <div key={i} className="p-4">
                <CommCard
                  c={c}
                  onDelete={async () => {
                    await postJSON(`${API_BASE}?route=write&name=communications&action=delete`, {
                      where: { id: c.id, subject: c.subject, linked_type: c.linked_type, linked_id: c.linked_id, created_date: c.created_date }
                    });
                    refetchComms();
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals secundarios */}
      <ItemEditModal
        open={!!editing}
        onClose={() => setEditing(null)}
        line={editing}
        onSaved={() => window.location.reload()}
      />
      <CommunicationModal
        open={commOpen}
        onClose={() => setCommOpen(false)}
        defaultLinked={{ type: "orders", id: poNumber }}
        onSaved={() => refetchComms()}
      />

      {/* Footer */}
      <div className="flex justify-end border-t p-4">
        <button onClick={onClose} className="rounded-lg border px-4 py-2">Close</button>
      </div>
    </Modal>
  );
}

/* ================
   UI helpers
   ================ */
function InfoTile({ label, value }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

