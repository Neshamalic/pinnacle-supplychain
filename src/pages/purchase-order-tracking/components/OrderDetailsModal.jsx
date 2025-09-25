// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import { useEffect, useMemo, useState } from "react";
import {
  API_BASE,
  fetchJSON,
  postJSON,
  formatCurrency,
  formatNumber,
  formatDate,
  badgeClass,
} from "../../../lib/utils";

function Section({ title, children }) {
  return (
    <div className="mb-4">
      {title ? (
        <h3 className="mb-2 text-sm font-semibold text-slate-700">{title}</h3>
      ) : null}
      {children}
    </div>
  );
}

function Pill({ children, className = "" }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 " +
        className
      }
    >
      {children}
    </span>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function Confirm({ text }) {
  return new Promise((resolve) => {
    const ok = window.confirm(text || "Are you sure?");
    resolve(ok);
  });
}

export default function OrderDetailsModal({ open, onClose, order }) {
  const poNumber = String(order?.po_number || "").trim();
  const ociNumber = String(order?.oci_number || "").trim();

  const [rowsPO, setRowsPO] = useState([]); // filas purchase_orders del PO
  const [imports, setImports] = useState(null); // fila de imports por OCI
  const [importItems, setImportItems] = useState([]); // import_items por OCI
  const [comms, setComms] = useState([]); // communications del PO
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("items"); // 'items' | 'comms'

  // ------- LOAD DATA -------
  useEffect(() => {
    if (!open) return;
    let abort = false;
    async function load() {
      try {
        setLoading(true);

        // Todas las filas de purchase_orders y nos quedamos con este PO
        const poRes = await fetchJSON(
          `${API_BASE}?route=table&name=purchase_orders`
        );
        const poRows = (poRes?.rows || []).filter(
          (r) => String(r.po_number || "").trim() === poNumber
        );

        // imports (por OCI)
        let impRow = null;
        if (ociNumber) {
          const impRes = await fetchJSON(
            `${API_BASE}?route=table&name=imports`
          );
          impRow = (impRes?.rows || []).find(
            (r) => String(r.oci_number || "").trim() === ociNumber
          );
        }

        // import_items (por OCI)
        let impItems = [];
        if (ociNumber) {
          const iiRes = await fetchJSON(
            `${API_BASE}?route=table&name=import_items`
          );
          impItems = (iiRes?.rows || []).filter(
            (r) => String(r.oci_number || "").trim() === ociNumber
          );
        }

        // communications: sólo orders + este PO
        const cRes = await fetchJSON(
          `${API_BASE}?route=table&name=communications&lt=orders&lid=${encodeURIComponent(
            poNumber
          )}&order=desc`
        );

        if (!abort) {
          setRowsPO(poRows);
          setImports(impRow || null);
          setImportItems(impItems);
          setComms(cRes?.rows || []);
        }
      } catch (err) {
        console.error(err);
        if (!abort) {
          setRowsPO([]);
          setImports(null);
          setImportItems([]);
          setComms([]);
        }
      } finally {
        if (!abort) setLoading(false);
      }
    }
    load();
    return () => {
      abort = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, poNumber, ociNumber]);

  // ------- HELPERS -------
  // suma importada por (OCI + presentation_code)
  const importedByCode = useMemo(() => {
    const map = new Map();
    for (const r of importItems || []) {
      const code = String(r.presentation_code || r.presentationCode || "").trim();
      const qty = Number(r.qty || r.quantity || 0);
      if (!code) continue;
      map.set(code, (map.get(code) || 0) + (Number.isFinite(qty) ? qty : 0));
    }
    return map;
  }, [importItems]);

  // Total USD del PO
  const totalUSD = useMemo(() => {
    let sum = 0;
    for (const r of rowsPO || []) {
      const qty = Number(r.total_qty || r.qty || 0);
      const price = Number(r.unit_price || r.unit_price_usd || r.price || 0);
      sum += (Number.isFinite(qty) ? qty : 0) * (Number.isFinite(price) ? price : 0);
    }
    return sum;
  }, [rowsPO]);

  // ------- EDIT ITEM -------
  async function onEditLine(line) {
    // edición básica: unit_price y total_qty
    const currentPrice = Number(line.unit_price || line.unit_price_usd || 0);
    const currentQty = Number(line.total_qty || 0);

    const p = window.prompt(
      `Unit price (USD)\n\nActual: ${currentPrice || 0}\n\nDeja en blanco para no cambiar.`,
      currentPrice ? String(currentPrice) : ""
    );
    const q = window.prompt(
      `Requested qty (total)\n\nActual: ${currentQty || 0}\n\nDeja en blanco para no cambiar.`,
      currentQty ? String(currentQty) : ""
    );

    const body = { route: "write", action: "update", name: "purchase_orders" };
    body.row = {
      po_number: poNumber,
      presentation_code: line.presentation_code,
    };

    if (p !== null && p !== "") body.row.unit_price = Number(p);
    if (q !== null && q !== "") body.row.total_qty = Number(q);

    try {
      const res = await postJSON(`${API_BASE}?route=write&action=update&name=purchase_orders`, body);
      if (!res?.ok) throw new Error(res?.error || "Update failed");
      // refrescar
      const poRes = await fetchJSON(`${API_BASE}?route=table&name=purchase_orders`);
      const poRows = (poRes?.rows || []).filter(
        (r) => String(r.po_number || "").trim() === poNumber
      );
      setRowsPO(poRows);
    } catch (err) {
      alert("No se pudo actualizar. " + err.message);
    }
  }

  // ------- COMMUNICATIONS -------
  async function handleAddCommunication() {
    const type = window.prompt(
      "Type (meeting, mail, call, whatsapp, other):",
      "meeting"
    );
    if (type === null) return;
    const subject = window.prompt("Subject:", "");
    if (subject === null) return;
    const participants = window.prompt(
      "Participants (Name1@…, Name2@…):",
      ""
    );
    if (participants === null) return;
    const content = window.prompt("Content:", "");
    if (content === null) return;

    try {
      const res = await postJSON(`${API_BASE}?route=write&action=create&name=communications`, {
        route: "write",
        action: "create",
        name: "communications",
        row: {
          type,
          subject,
          participants,
          content,
          linked_type: "orders",
          linked_id: poNumber,
        },
      });
      if (!res?.ok) throw new Error(res?.error || "Create failed");

      const cRes = await fetchJSON(
        `${API_BASE}?route=table&name=communications&lt=orders&lid=${encodeURIComponent(
          poNumber
        )}&order=desc`
      );
      setComms(cRes?.rows || []);
    } catch (err) {
      alert("No se pudo crear la comunicación. " + err.message);
    }
  }

  async function handleDeleteCommunication(comm) {
    const ok = await Confirm("Are you sure you want to delete?");
    if (!ok) return;
    try {
      // preferimos id; si no viene, backend usa fallback por keys
      const where = comm.id ? { id: comm.id } : { created_date: comm.created_date, subject: comm.subject };
      const res = await postJSON(`${API_BASE}?route=write&action=delete&name=communications`, {
        route: "write",
        action: "delete",
        name: "communications",
        where,
      });
      if (!res?.ok) throw new Error(res?.error || "Delete failed");

      const cRes = await fetchJSON(
        `${API_BASE}?route=table&name=communications&lt=orders&lid=${encodeURIComponent(
          poNumber
        )}&order=desc`
      );
      setComms(cRes?.rows || []);
    } catch (err) {
      alert("No se pudo eliminar. " + err.message);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4">
      <div className="w-full max-w-5xl rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Order Details – PO</h2>
            {poNumber ? <Pill>PO-{poNumber.replace(/^PO-?/i, "")}</Pill> : null}
            {ociNumber ? <Pill>OCI-{ociNumber.replace(/^OCI-?/i, "")}</Pill> : null}
          </div>
          <div className="text-sm text-slate-500">
            Created: {formatDate(order?.created_date)}
          </div>
          <button
            className="ml-4 rounded-full p-1 text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 border-b px-6 pt-3">
          <button
            className={`border-b-2 px-2 pb-3 text-sm ${
              tab === "items"
                ? "border-indigo-500 font-medium text-indigo-600"
                : "border-transparent text-slate-600 hover:text-slate-800"
            }`}
            onClick={() => setTab("items")}
          >
            Items
          </button>
          <button
            className={`border-b-2 px-2 pb-3 text-sm ${
              tab === "comms"
                ? "border-indigo-500 font-medium text-indigo-600"
                : "border-transparent text-slate-600 hover:text-slate-800"
            }`}
            onClick={() => setTab("comms")}
          >
            Communications
          </button>
        </div>

        {/* BODY */}
        <div className="px-6 py-5">
          {tab === "items" ? (
            <>
              {/* Top stats */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard label="PO Number" value={poNumber || "—"} />
                <StatCard label="Created" value={formatDate(order?.created_date) || "—"} />
                <StatCard label="Total (USD)" value={formatCurrency(totalUSD)} />
              </div>

              {/* Products */}
              <Section title="Products">
                {loading ? (
                  <div className="py-8 text-center text-slate-500">Loading…</div>
                ) : rowsPO.length === 0 ? (
                  <div className="py-8 text-center text-slate-500">No items found.</div>
                ) : (
                  rowsPO.map((r, idx) => {
                    const code = String(r.presentation_code || "").trim();
                    const unitPrice =
                      Number(r.unit_price || r.unit_price_usd || r.price || 0) || 0;
                    const requested = Number(r.total_qty || r.qty || 0) || 0;
                    const imported = importedByCode.get(code) || 0;
                    const remaining = Math.max(requested - imported, 0);

                    const impStatus = String(imports?.import_status || "").toLowerCase();
                    const transport = String(imports?.transport_type || "").toLowerCase();

                    return (
                      <div
                        key={`${poNumber}-${code}-${idx}`}
                        className="mb-4 rounded-2xl border border-slate-100 bg-slate-50/50"
                      >
                        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
                          <div>
                            <div className="text-base font-semibold text-slate-900">
                              {code || "—"}
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              {impStatus ? (
                                <span className={`rounded-full px-2 py-0.5 text-xs ${badgeClass("manufacturing", impStatus)}`}>
                                  {impStatus}
                                </span>
                              ) : null}
                              {transport ? (
                                <span className={`rounded-full px-2 py-0.5 text-xs ${badgeClass("transport", transport)}`}>
                                  {transport}
                                </span>
                              ) : null}
                              {ociNumber ? <Pill>OCI-{ociNumber.replace(/^OCI-?/i, "")}</Pill> : null}
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-sm text-slate-500">
                              {formatCurrency(unitPrice)} <span className="text-slate-400">/ unit</span>
                            </div>
                            <button
                              className="rounded-lg bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                              onClick={() => onEditLine(r)}
                            >
                              Edit
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
                          <StatCard label="Requested" value={formatNumber(requested)} />
                          <StatCard label="Imported" value={formatNumber(imported)} />
                          <StatCard label="Remaining" value={formatNumber(remaining)} />
                        </div>
                      </div>
                    );
                  })
                )}
              </Section>
            </>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm text-slate-500">
                  Linked to <b>Orders</b> • <b>{poNumber}</b>
                </div>
                <button
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                  onClick={handleAddCommunication}
                >
                  + Add
                </button>
              </div>

              {loading ? (
                <div className="py-8 text-center text-slate-500">Loading…</div>
              ) : comms.length === 0 ? (
                <div className="py-8 text-center text-slate-500">No messages yet.</div>
              ) : (
                <div className="space-y-3">
                  {comms.map((c) => (
                    <CommCard
                      key={c.id || `${c.created_date}::${c.subject}`}
                      comm={c}
                      onDelete={() => handleDeleteCommunication(c)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Communication card (collapsible) ----------
function CommCard({ comm, onDelete }) {
  const [open, setOpen] = useState(false);
  const createdISO = comm.created_date || comm.created || comm.date;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-900">{comm.subject || "(no subject)"}</div>
          <div className="mt-0.5 text-xs text-slate-500">
            {String(comm.type || "").toLowerCase()} • {comm.participants || "—"}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-400">{formatDate(createdISO)}</div>
          <button
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      </div>

      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
        {open ? comm.content : (comm.preview || (comm.content || "")).slice(0, 220)}
        {(!open && (comm.content || "").length > 220) && "…"}
      </p>

      {(comm.content || "").length > 220 && (
        <button
          className="mt-2 text-sm font-medium text-indigo-600 hover:underline"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Show less" : "Show more"}
        </button>
      )}

      <div className="mt-2 text-xs text-slate-400">
        Linked: orders • {comm.linked_id || "—"}
      </div>
    </div>
  );
}
