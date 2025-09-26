import React, { useEffect, useMemo, useState } from "react";
import { API_BASE, fetchJSON, postJSON, formatNumber, formatCurrency, formatDate } from "@/lib/utils";

// ===== Helpers locales y robustos =====
const str = (v) => (v == null ? "" : String(v).trim());
const pick = (obj, keys, d = "") => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v != null && v !== "") return v;
  }
  return d;
};
/** Convierte "1.234,56" -> 1234.56 | "1,234.56" -> 1234.56 | "1,14" -> 1.14 | "1.14" -> 1.14 */
const numFromInput = (v) => {
  if (v == null || v === "") return 0;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v).trim();
  if (s.includes(".") && s.includes(",")) {
    // Último separador es el decimal
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      return parseFloat(s.replace(/\./g, "").replace(",", "."));
    }
    return parseFloat(s.replace(/,/g, ""));
  }
  if (s.includes(",") && !s.includes(".")) return parseFloat(s.replace(",", "."));
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

export default function OrderDetailsModal({ open, onClose, order }) {
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("items"); // 'items' | 'comms'

  // Data
  const [poRows, setPoRows] = useState([]);           // purchase_orders (filtrada por PO)
  const [importItems, setImportItems] = useState([]); // import_items (filtrada por PO)
  const [comms, setComms] = useState([]);             // communications (filtrada por orders + PO)

  // Edit header
  const [editOpen, setEditOpen] = useState(false);
  const [costUsd, setCostUsd] = useState("");
  const [totalQty, setTotalQty] = useState("");

  // New communication
  const [newOpen, setNewOpen] = useState(false);
  const [commType, setCommType] = useState("meeting");
  const [commSubject, setCommSubject] = useState("");
  const [commParticipants, setCommParticipants] = useState("");
  const [commContent, setCommContent] = useState("");

  const poNumber = str(pick(order || {}, ["po_number", "po", "poNumber", "id"]));

  // Header label: "OCI-171 / PO-171" (una sola vez)
  const headerLabel = useMemo(() => {
    const oci = str(pick(order || {}, ["oci_number", "oci"]));
    if (oci && poNumber) return `${oci} / ${poNumber}`;
    if (poNumber) return `PO ${poNumber}`;
    if (oci) return `OCI ${oci}`;
    return "Order Details";
  }, [order, poNumber]);

  // Carga
  async function refetchAll() {
    if (!poNumber) return;
    setLoading(true);
    try {
      const [poRes, impItemsRes, commRes] = await Promise.all([
        fetchJSON(`${API_BASE}?route=table&name=purchase_orders&po=${encodeURIComponent(poNumber)}`),
        fetchJSON(`${API_BASE}?route=table&name=import_items&po=${encodeURIComponent(poNumber)}`),
        fetchJSON(
          `${API_BASE}?route=table&name=communications&linked_type=orders&linked_id=${encodeURIComponent(
            poNumber
          )}&order=desc`
        ),
      ]);
      setPoRows(poRes?.rows || []);
      setImportItems(impItemsRes?.rows || []);
      setComms(commRes?.rows || []);
    } catch (e) {
      console.error("OrderDetailsModal load error:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    refetchAll();
  }, [open, poNumber]);

  // Items agregados por código (ordered/imported/remaining)
  const items = useMemo(() => {
    const byCode = new Map();
    for (const r of poRows) {
      const code = str(pick(r, ["presentation_code", "sku", "code"]));
      const ordered = Number(pick(r, ["ordered_qty", "qty", "quantity", "total_qty"], 0)) || 0;
      const unitPrice = Number(pick(r, ["unit_price_usd", "unit_price", "price"], 0)) || 0;
      if (!code) continue;
      const prev = byCode.get(code) || { presentationCode: code, ordered: 0, imported: 0, unitPrice };
      byCode.set(code, {
        ...prev,
        ordered: prev.ordered + ordered,
        unitPrice: unitPrice || prev.unitPrice,
      });
    }
    for (const r of importItems) {
      const code = str(pick(r, ["presentation_code", "sku", "code"]));
      const qty = Number(pick(r, ["qty", "quantity"], 0)) || 0;
      if (!code) continue;
      const prev = byCode.get(code) || { presentationCode: code, ordered: 0, imported: 0, unitPrice: 0 };
      byCode.set(code, { ...prev, imported: prev.imported + qty });
    }
    return Array.from(byCode.values()).map((r) => ({
      ...r,
      remaining: Math.max(0, Number(r.ordered) - Number(r.imported)),
    }));
  }, [poRows, importItems]);

  // Guardar header (cost_usd, total_qty)
  async function handleSaveHeader() {
    try {
      const payload = {
        row: {
          po_number: poNumber,
          cost_usd: numFromInput(costUsd),
          total_qty: numFromInput(totalQty),
        },
      };
      const res = await postJSON(`${API_BASE}?route=write&action=update&name=purchase_orders`, payload);
      if (!res?.ok && !res?.updated && !res?.upserted) throw new Error(JSON.stringify(res));
      setEditOpen(false);
      await refetchAll();
    } catch (e) {
      alert("No se pudo guardar. Revisa el formato de números.\n" + String(e));
    }
  }

  // Crear communication
  async function handleCreateComm() {
    try {
      const body = {
        type: commType,
        subject: commSubject,
        participants: commParticipants,
        content: commContent,
        linked_type: "orders",
        linked_id: poNumber,
      };
      const res = await postJSON(`${API_BASE}?route=write&action=create&name=communications`, body);
      if (!res?.ok) throw new Error(JSON.stringify(res));
      setNewOpen(false);
      setCommType("meeting");
      setCommSubject("");
      setCommParticipants("");
      setCommContent("");
      await refetchAll();
      setTab("comms");
    } catch (e) {
      alert("No se pudo crear la comunicación.\n" + String(e));
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="mx-auto w-full max-w-6xl rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <div className="text-xs text-slate-500">Order Details —</div>
            <div className="text-lg font-semibold">{headerLabel}</div>
          </div>
          <button
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 px-6 pt-4">
          <button
            className={`pb-2 text-sm ${
              tab === "items" ? "border-b-2 border-blue-600 text-blue-700" : "text-slate-500"
            }`}
            onClick={() => setTab("items")}
          >
            Items
          </button>
          <button
            className={`pb-2 text-sm ${
              tab === "comms" ? "border-b-2 border-blue-600 text-blue-700" : "text-slate-500"
            }`}
            onClick={() => setTab("comms")}
          >
            Communications
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 pt-2">
          {loading ? (
            <div className="p-6 text-slate-500">Cargando…</div>
          ) : tab === "items" ? (
            <>
              {/* Summary + botón editar header */}
              <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3">
                <div>
                  <div className="text-xs text-slate-500">Products</div>
                  <div className="text-xl font-semibold">{formatNumber(items.length)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Ordered (sum)</div>
                  <div className="text-xl font-semibold">
                    {formatNumber(items.reduce((s, r) => s + Number(r.ordered || 0), 0))}
                  </div>
                </div>
                <div className="flex items-center justify-end">
                  <button
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                    onClick={() => {
                      const row0 = poRows[0] || {};
                      setCostUsd(str(pick(row0, ["cost_usd", "usd", "amount_usd"], "")));
                      setTotalQty(str(pick(row0, ["total_qty", "qty_total"], "")));
                      setEditOpen(true);
                    }}
                  >
                    Edit header (costs)
                  </button>
                </div>
              </div>

              {/* Tabla items */}
              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="grid grid-cols-5 gap-2 border-b px-4 py-2 text-xs text-slate-500">
                  <div>Code</div>
                  <div className="text-right">Ordered</div>
                  <div className="text-right">Imported</div>
                  <div className="text-right">Remaining</div>
                  <div className="text-right">Unit Price</div>
                </div>
                {items.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-slate-500">No items found.</div>
                ) : (
                  items.map((it) => (
                    <div key={it.presentationCode} className="grid grid-cols-5 gap-2 px-4 py-2 text-sm">
                      <div className="font-medium">{it.presentationCode}</div>
                      <div className="text-right">{formatNumber(it.ordered)}</div>
                      <div className="text-right">{formatNumber(it.imported)}</div>
                      <div className="text-right">{formatNumber(it.remaining)}</div>
                      <div className="text-right">{formatCurrency(it.unitPrice)}</div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              {/* Header Communications */}
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Linked to: <span className="font-medium">orders</span> /{" "}
                  <span className="font-mono">{poNumber || "—"}</span>
                </div>
                <button
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                  onClick={() => setNewOpen(true)}
                >
                  + Add
                </button>
              </div>

              {/* Listado Communications simple */}
              <div className="space-y-3">
                {comms.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                    No communications yet.
                  </div>
                ) : (
                  comms.map((c) => (
                    <div key={c.id || c._virtual_id || Math.random()} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{str(c.subject) || "(No subject)"}</span>
                          {String(c.unread).toLowerCase() === "true" && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Unread</span>
                          )}
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">Orders</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDate(pick(c, ["created_date", "created", "date"]) || "") || "—"}
                        </div>
                      </div>
                      <div className="text-sm text-slate-700 whitespace-pre-wrap">{str(c.content)}</div>
                      <div className="mt-2 text-xs text-slate-500">Linked: orders • {poNumber}</div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal editar header */}
      {editOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
            <div className="mb-3 text-lg font-semibold">Edit costs (header)</div>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="text-slate-600">Cost USD</span>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={costUsd}
                  onChange={(e) => setCostUsd(e.target.value)}
                  placeholder="Ej: 1,10 o 1.10"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">Total Qty</span>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={totalQty}
                  onChange={(e) => setTotalQty(e.target.value)}
                  placeholder="Ej: 1.000 o 1000"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-lg border px-3 py-2 text-sm" onClick={() => setEditOpen(false)}>
                Cancel
              </button>
              <button
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                onClick={handleSaveHeader}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal +Add Communication simple */}
      {newOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-4 shadow-xl">
            <div className="mb-3 text-lg font-semibold">New Communication</div>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="text-slate-600">Type</span>
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={commType}
                  onChange={(e) => setCommType(e.target.value)}
                >
                  <option value="meeting">Meeting</option>
                  <option value="mail">Mail</option>
                  <option value="call">Call</option>
                  <option value="whatsapp">Whatsapp</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">Subject</span>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={commSubject}
                  onChange={(e) => setCommSubject(e.target.value)}
                  placeholder="Ej: Reunión semanal / Cotización / etc."
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">Participants</span>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={commParticipants}
                  onChange={(e) => setCommParticipants(e.target.value)}
                  placeholder="name1@..., name2@..."
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">Content</span>
                <textarea
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  rows={6}
                  value={commContent}
                  onChange={(e) => setCommContent(e.target.value)}
                  placeholder="Escribe la nota, correo, resumen de llamada, etc."
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-lg border px-3 py-2 text-sm" onClick={() => setNewOpen(false)}>
                Cancel
              </button>
              <button
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                onClick={handleCreateComm}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
