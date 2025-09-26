// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import { useEffect, useMemo, useState } from "react";
import { API_BASE, fetchJSON, postJSON, formatCurrency, formatDate, formatNumber, badgeClass } from "../../../lib/utils";

/** UI helpers */
function Chip({ children, className = "" }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{children}</span>
  );
}
function Card({ children }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">{children}</div>;
}
function SectionTitle({ children }) {
  return <h3 className="mb-2 text-sm font-semibold text-slate-600">{children}</h3>;
}

/** Small helpers */
const num = (v) => {
  const n = Number(String(v ?? "").replace(/\./g, "").replace(/,/g, "."));
  return Number.isFinite(n) ? n : 0;
};
const by = (prop) => (a, b) => (a[prop] > b[prop] ? 1 : a[prop] < b[prop] ? -1 : 0);

/** ---- Main modal ---- */
export default function OrderDetailsModal({ open, onClose, order }) {
  const po = String(order?.po_number || order?.po || "").trim();
  const oci = String(order?.oci_number || order?.oci || "").trim();

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("items"); // items | comms
  const [rowsPO, setRowsPO] = useState([]);
  const [rowsImports, setRowsImports] = useState([]);
  const [rowsImportItems, setRowsImportItems] = useState([]);
  const [rowsMaster, setRowsMaster] = useState([]);

  // communications
  const [comms, setComms] = useState([]);
  const [busyComm, setBusyComm] = useState(false);

  // ---- load all data needed for this PO (and OCI) ----
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);

        // All purchase_orders (we’ll filter below)
        const [poRes, impRes, impItemsRes] = await Promise.all([
          fetchJSON(`${API_BASE}?route=table&name=purchase_orders`),
          fetchJSON(`${API_BASE}?route=table&name=imports`),
          fetchJSON(`${API_BASE}?route=table&name=import_items`),
        ]);

        // product master: try common sheet names, use first that returns ok
        let masterRows = [];
        const candidateSheets = [
          "product_presentation_master",
          "producto_presentation_master",
          "product_presentation",
          "presentation_master",
        ];
        for (const name of candidateSheets) {
          try {
            const r = await fetchJSON(`${API_BASE}?route=table&name=${name}`);
            if (r?.ok && Array.isArray(r.rows)) {
              masterRows = r.rows;
              break;
            }
          } catch {
            /* try next name */
          }
        }

        if (!alive) return;
        setRowsPO(poRes?.rows || []);
        setRowsImports(impRes?.rows || []);
        setRowsImportItems(impItemsRes?.rows || []);
        setRowsMaster(masterRows);

        // communications – only for Orders + this PO
        try {
          const commRes = await fetchJSON(
            `${API_BASE}?route=table&name=communications&lt=orders&lid=${encodeURIComponent(po)}&order=desc`
          );
          if (alive) setComms(commRes?.rows || []);
        } catch {
          if (alive) setComms([]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [po, oci]);

  /** index master by presentation_code */
  const masterByCode = useMemo(() => {
    const map = new Map();
    for (const r of rowsMaster) {
      const code =
        String(r.presentation_code || r.product_code || r.presentationCode || r.sku || r.code || "").trim();
      if (!code) continue;
      const name = String(r.product_name || r.productName || r.name || "").trim();
      const units =
        num(r.package_units || r.units_per_package || r.packageUnits || r.units || r.package_size || 0) || 1;
      map.set(code, { code, name, units });
    }
    return map;
  }, [rowsMaster]);

  /** imports info for this OCI */
  const importInfo = useMemo(() => {
    const r = rowsImports.find(
      (x) => String(x.oci_number || x.oci || "").trim() === oci
    );
    const import_status = String(r?.import_status || r?.status || "").toLowerCase();
    const transport = String(r?.transport_type || r?.transport || "").toLowerCase();
    return { import_status, transport };
  }, [rowsImports, oci]);

  /** Build product lines from purchase_orders */
  const productLines = useMemo(() => {
    if (!po) return [];
    // filter rows for this PO (and, if present, same OCI)
    const filtered = rowsPO.filter((r) => {
      const rpo = String(r.po_number || r.po || "").trim();
      const roci = String(r.oci_number || r.oci || "").trim();
      if (oci) return rpo === po && roci === oci;
      return rpo === po;
    });

    // group by presentation_code
    const byCode = new Map();
    for (const r of filtered) {
      const code = String(r.presentation_code || r.product_code || r.sku || r.code || "").trim();
      if (!code) continue;

      const unitPrice =
        num(r.cost_usd || r.unit_price_usd || r.unit_price || r.price_usd || r.price);

      const totalQty = num(r.total_qty || r.ordered_qty || r.req_qty || r.qty);

      const m = masterByCode.get(code) || { name: "", units: 1 };

      // sum per code (in case you have more than one row)
      const prev = byCode.get(code) || { code, name: m.name, units: m.units, unitPrice: 0, requested: 0 };
      byCode.set(code, {
        code,
        name: m.name,
        units: m.units || 1,
        unitPrice: unitPrice || prev.unitPrice, // keep first non-zero
        requested: prev.requested + totalQty,
      });
    }

    // compute “imported” from import_items (oci + code)
    for (const [code, obj] of byCode) {
      const imported = rowsImportItems
        .filter(
          (ii) =>
            String(ii.oci_number || ii.oci || "").trim() === oci &&
            String(ii.presentation_code || ii.product_code || ii.sku || ii.code || "").trim() === code
        )
        .reduce((acc, ii) => acc + num(ii.qty || ii.quantity), 0);
      obj.imported = imported;
      obj.remaining = Math.max(0, (obj.requested || 0) - (obj.imported || 0));
    }

    return Array.from(byCode.values()).sort(by("code"));
  }, [rowsPO, rowsImportItems, masterByCode, po, oci]);

  const totalUSD = useMemo(
    () => productLines.reduce((acc, l) => acc + (l.requested || 0) * (l.unitPrice || 0), 0),
    [productLines]
  );

  /** ---- Edit per product (qty + unit price) ---- */
  async function onEditLine(line) {
    // simple 2-step prompt editor
    const currentPrice = line.unitPrice || 0;
    const priceStr = window.prompt(`Unit price (USD)\nActual: ${currentPrice}\n\nDeja en blanco para no cambiar.`, "");
    if (priceStr === null) return;

    const currentQty = line.requested || 0;
    const qtyStr = window.prompt(`Requested quantity\nActual: ${currentQty}\n\nDeja en blanco para no cambiar.`, "");
    if (qtyStr === null) return;

    const nextPrice = priceStr.trim() ? num(priceStr) : currentPrice;
    const nextQty = qtyStr.trim() ? num(qtyStr) : currentQty;
    if (!po || !line?.code) return;

    // update row in purchase_orders (key: po_number + presentation_code)
    await postJSON(API_BASE, {
      route: "write",
      action: "update",
      name: "purchase_orders",
      row: {
        po_number: po,
        presentation_code: line.code,
        total_qty: nextQty,
        cost_usd: nextPrice,
      },
    });

    // reload locally
    const res = await fetchJSON(`${API_BASE}?route=table&name=purchase_orders`);
    setRowsPO(res?.rows || []);
  }

  /** ---- Communications (filtered to Orders + this PO) ---- */
  async function reloadComms() {
    const commRes = await fetchJSON(
      `${API_BASE}?route=table&name=communications&lt=orders&lid=${encodeURIComponent(po)}&order=desc`
    );
    setComms(commRes?.rows || []);
  }

  async function onAddComm() {
    // Open the full form used elsewhere? If not available, use a guided prompt (simple & quick).
    try {
      setBusyComm(true);

      // If tienes tu modal “New Communication”, reemplaza esta sección por abrir ese modal.
      const type = window.prompt("Type (meeting, mail, call, whatsapp, other):", "meeting");
      if (!type) return;
      const subject = window.prompt("Subject:", "") || "";
      const participants = window.prompt("Participants (comma separated):", "") || "";
      const content = window.prompt("Content:", "") || "";

      await postJSON(API_BASE, {
        route: "write",
        action: "create",
        name: "communications",
        row: {
          type,
          subject,
          participants,
          content,
          linked_type: "orders",
          linked_id: po,
          unread: "true",
        },
      });

      await reloadComms();
    } finally {
      setBusyComm(false);
    }
  }

  async function onDeleteComm(c) {
    if (!c?.id && !c?._virtual_id) return;
    if (!window.confirm("Are you sure you want to delete?")) return;

    // prefer id; fallback to created_date+subject key used by your script
    const where = c.id ? { id: c.id } : { created_date: c.created_date || c.created || c.date, subject: c.subject };
    await postJSON(API_BASE, {
      route: "write",
      action: "delete",
      name: "communications",
      where,
    });
    await reloadComms();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4">
      <div className="h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Order Details – PO</h2>
            {po && <Chip className="bg-slate-100 text-slate-700">{po}</Chip>}
            {oci && <Chip className="bg-slate-100 text-slate-700">{oci}</Chip>}
          </div>
          <div className="text-sm text-slate-500">Created: {formatDate(order?.created_date)}</div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 border-b px-5">
          <button
            className={`-mb-px border-b-2 px-1 py-3 text-sm ${
              tab === "items" ? "border-indigo-500 font-medium text-indigo-700" : "border-transparent text-slate-500"
            }`}
            onClick={() => setTab("items")}
          >
            Items
          </button>
          <button
            className={`-mb-px border-b-2 px-1 py-3 text-sm ${
              tab === "comms" ? "border-indigo-500 font-medium text-indigo-700" : "border-transparent text-slate-500"
            }`}
            onClick={() => setTab("comms")}
          >
            Communications
          </button>
        </div>

        {/* Content */}
        <div className="h-[calc(90vh-96px)] overflow-y-auto p-5">
          {/* ITEMS TAB */}
          {tab === "items" && (
            <div className="space-y-4">
              {/* header cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card>
                  <SectionTitle>PO Number</SectionTitle>
                  <div className="text-lg font-semibold">{po || "—"}</div>
                </Card>
                <Card>
                  <SectionTitle>Created</SectionTitle>
                  <div className="text-lg font-semibold">{formatDate(order?.created_date) || "—"}</div>
                </Card>
                <Card>
                  <SectionTitle>Total (USD)</SectionTitle>
                  <div className="text-lg font-semibold">{formatCurrency(totalUSD)}</div>
                </Card>
              </div>

              <h3 className="mt-2 text-base font-semibold text-slate-700">Products</h3>

              {loading && <div className="text-sm text-slate-500">Loading…</div>}

              {!loading && productLines.length === 0 && (
                <div className="text-sm text-slate-500">No items found.</div>
              )}

              {!loading &&
                productLines.map((l) => (
                  <div key={l.code} className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold text-slate-800">
                          {l.name || l.code}
                          {l.units ? (
                            <span className="ml-2 text-sm font-normal text-slate-500">• {l.units} units/pack</span>
                          ) : null}
                        </div>
                        <div className="text-xs text-slate-500">Code: {l.code}</div>
                        <div className="mt-2 flex items-center gap-2">
                          {/* import status & transport */}
                          {importInfo.import_status && (
                            <Chip className={badgeClass("transport", importInfo.transport)}>
                              {importInfo.import_status || "—"}
                            </Chip>
                          )}
                          {importInfo.transport && (
                            <Chip className={badgeClass("transport", importInfo.transport)}>
                              {importInfo.transport || "—"}
                            </Chip>
                          )}
                          {oci && <Chip className="bg-slate-100 text-slate-700">{oci}</Chip>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-slate-500">{formatCurrency(l.unitPrice)} / unit</div>
                        <button
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                          onClick={() => onEditLine(l)}
                        >
                          Edit
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <Card>
                        <SectionTitle>Requested</SectionTitle>
                        <div className="text-2xl font-semibold">{formatNumber(l.requested)}</div>
                      </Card>
                      <Card>
                        <SectionTitle>Imported</SectionTitle>
                        <div className="text-2xl font-semibold">{formatNumber(l.imported)}</div>
                      </Card>
                      <Card>
                        <SectionTitle>Remaining</SectionTitle>
                        <div className="text-2xl font-semibold">{formatNumber(l.remaining)}</div>
                      </Card>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* COMMUNICATIONS TAB */}
          {tab === "comms" && (
            <div className="space-y-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm text-slate-500">
                  Linked to <b>Orders</b> • <span className="font-medium">{po}</span>
                  {oci ? (
                    <>
                      {" "}
                      — <b>Imports</b> • <span className="font-medium">{oci}</span>
                    </>
                  ) : null}
                </div>
                <button
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  onClick={onAddComm}
                  disabled={busyComm}
                >
                  + Add
                </button>
              </div>

              {comms.map((c) => (
                <div key={c.id || c._virtual_id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold">{c.subject || "(no subject)"}</div>
                      <div className="text-xs text-slate-500">
                        {String(c.type || "").toLowerCase()} • {c.participants || "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-slate-400">{formatDate(c.created_date || c.created || c.date)}</div>
                      <button
                        className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700"
                        onClick={() => onDeleteComm(c)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-slate-700">
                    {String(c.content || c.preview || "").slice(0, 600)}
                  </p>
                  <div className="mt-2 text-xs text-slate-500">
                    Linked: orders • {po}
                  </div>
                </div>
              ))}

              {comms.length === 0 && (
                <div className="text-sm text-slate-500">No communications for this PO.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
