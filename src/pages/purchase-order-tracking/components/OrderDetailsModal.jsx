// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  API_BASE,
  fetchJSON,
  postJSON,
  formatDate,
  formatCurrencyNormalized,
  formatNumber,
  badgeClass,
} from "../../../lib/utils";

// Chip simple
function Chip({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

// Card info chica
function StatCard({ label, children }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-base font-semibold text-slate-800">{children}</div>
    </div>
  );
}

// Un bloque de producto (línea)
function ProductBlock({ line }) {
  const {
    presentation_code,
    product_name,
    package_units,
    unit_price_usd,
    requested_qty,
    imported_qty,
    remaining_qty,
    transport_type,
    import_status,
    oci_number,
  } = line;

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-lg font-semibold text-slate-900">
            {product_name || "Product"}{" "}
            <span className="text-slate-400">
              • {package_units ? `${package_units} units/pack` : presentation_code}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-600">
            <span className="font-medium">Code:</span> {presentation_code}
          </div>
        </div>

        <div className="text-sm text-slate-600">
          <span className="font-semibold">{formatCurrencyNormalized(unit_price_usd)}</span>{" "}
          <span className="text-slate-400">/ unit</span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className={badgeClass("transport", transport_type)} style={{ padding: "2px 8px", borderRadius: 999 }}>
          {transport_type || "—"}
        </span>
        <span className={badgeClass("manufacturing", import_status)} style={{ padding: "2px 8px", borderRadius: 999 }}>
          {import_status || "—"}
        </span>
        {oci_number ? <Chip>OCI {oci_number.replace(/^OCI[-\s]?/i, "").trim() ? `OCI-${oci_number.replace(/^OCI[-\s]?/i, "").trim()}` : oci_number}</Chip> : null}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard label="Requested">
          {formatNumber(requested_qty)}
        </StatCard>
        <StatCard label="Imported">
          {formatNumber(imported_qty)}
        </StatCard>
        <StatCard label="Remaining">
          {formatNumber(remaining_qty)}
        </StatCard>
      </div>
    </div>
  );
}

/** ========== API helpers ========== */
async function getSheet(name, params = "") {
  const url = `${API_BASE}?route=table&name=${encodeURIComponent(name)}${params}`;
  const res = await fetchJSON(url);
  if (!res?.ok) throw new Error(res?.error || `Error loading ${name}`);
  return res.rows || [];
}

async function createComm(row) {
  return postJSON(`${API_BASE}?route=write&name=communications&action=create`, { row });
}
async function deleteComm(where) {
  return postJSON(`${API_BASE}?route=write&name=communications&action=delete`, { where });
}

/** ========== Modal principal ========== */
export default function OrderDetailsModal({ open, onClose, order }) {
  const [poRow, setPoRow] = useState(order || null);
  const [items, setItems] = useState([]); // líneas (producto enriquecido)
  const [totalUsd, setTotalUsd] = useState(0);
  const [loading, setLoading] = useState(false);

  // Communications
  const [comms, setComms] = useState([]);
  const [commLoading, setCommLoading] = useState(false);

  const poNumber = poRow?.po_number || poRow?.poNumber || "";
  const ociNumber = (poRow?.oci_number || poRow?.ociNumber || "").toString().trim();

  const loadItems = useCallback(async () => {
    if (!poNumber) return;
    setLoading(true);
    try {
      // purchase_orders (todas las filas; ahora todo está en esta hoja)
      const poRows = await getSheet("purchase_orders");
      // Sólo las filas de este PO
      const lines = poRows.filter(r => (r.po_number || "").toString().trim() === poNumber);

      // Maestro de presentaciones
      const master = await getSheet("product_presentation_master");
      const masterByCode = new Map(
        master.map(m => [ (m.product_code || m.presentation_code || "").toString().trim(), m ])
      );

      // imports (para status/transport por oci)
      const importsRows = await getSheet("imports");
      const importByOci = new Map(importsRows.map(r => [ (r.oci_number || "").toString().trim(), r ]));

      // import_items para sumar importado por (oci_number, presentation_code)
      const importItems = await getSheet("import_items");

      // construir líneas enriquecidas
      const enriched = lines.map(r => {
        const pres = (r.presentation_code || "").toString().trim();
        const u = Number(r.cost_usd ?? r.unit_price_usd ?? r.unit_price ?? 0);
        const requested = Number(r.total_qty ?? r.ordered_qty ?? r.qty ?? 0);

        // status & transport desde imports por OCI global del PO o por r.oci_number si viene a nivel fila
        const ociForLine = (r.oci_number || ociNumber).toString().trim();
        const impRow = importByOci.get(ociForLine) || {};

        // sumar importado
        const imported = importItems
          .filter(ii =>
            (ii.oci_number || "").toString().trim() === ociForLine &&
            (ii.presentation_code || "").toString().trim() === pres
          )
          .reduce((acc, ii) => acc + Number(ii.qty || 0), 0);

        const remaining = Math.max(0, requested - imported);

        const m = masterByCode.get(pres) || {};
        return {
          presentation_code: pres,
          product_name: m.product_name || r.product_name || "",
          package_units: Number(m.package_units || r.package_units || 0) || undefined,
          unit_price_usd: u,
          requested_qty: requested,
          imported_qty: imported,
          remaining_qty: remaining,
          transport_type: (impRow.transport_type || "").toString().toLowerCase(),
          import_status: (impRow.import_status || "").toString().toLowerCase(),
          oci_number: ociForLine,
        };
      });

      // total USD = sum(requested_qty * unit_price_usd)
      const total = enriched.reduce((acc, l) => acc + (Number(l.requested_qty) * Number(l.unit_price_usd || 0)), 0);

      setItems(enriched);
      setTotalUsd(total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [poNumber, ociNumber]);

  const loadComms = useCallback(async () => {
    if (!poNumber) return;
    setCommLoading(true);
    try {
      // Filtra en servidor: linked_type=orders, linked_id=PO-171
      const rows = await getSheet(
        "communications",
        `&lt=orders&lid=${encodeURIComponent(poNumber)}&order=desc`
      );
      // Evita duplicados por id
      const seen = new Set();
      const filtered = [];
      for (const r of rows) {
        const k = r.id || `${r.created_date || r.created || r.date || ""}::${r.subject || ""}`;
        if (seen.has(k)) continue;
        seen.add(k);
        filtered.push(r);
      }
      setComms(filtered);
    } catch (e) {
      console.error(e);
    } finally {
      setCommLoading(false);
    }
  }, [poNumber]);

  useEffect(() => {
    setPoRow(order || null);
  }, [order]);

  useEffect(() => {
    if (!open || !poNumber) return;
    loadItems();
    loadComms();
  }, [open, poNumber, loadItems, loadComms]);

  // Crear comunicación
  const handleAddComm = async () => {
    const subject = prompt("Subject?");
    if (!subject) return;
    const content = prompt("Content?");
    try {
      await createComm({
        subject,
        content,
        type: "note",
        participants: "",
        linked_type: "orders",
        linked_id: poNumber,
        unread: "true",
      });
      await loadComms();
    } catch (e) {
      alert("Error creating communication");
      console.error(e);
    }
  };

  // Eliminar comunicación
  const handleDelete = async (row) => {
    if (!confirm("Are you sure you want to delete?")) return;
    try {
      const where = row.id
        ? { id: row.id }
        : { created_date: row.created_date || row.created || row.date, subject: row.subject || "" };
      const res = await deleteComm(where);
      if (!res?.ok && !res?.removed) {
        // Apps Script devuelve { ok:true, removed:{...} } – si falla, intentamos por keys
        await deleteComm({ created_date: where.created_date, subject: where.subject });
      }
      await loadComms();
    } catch (e) {
      alert('No se pudo eliminar. Refresca e intenta nuevamente.');
      console.error(e);
    }
  };

  const totalChip = formatCurrencyNormalized(totalUsd);

  const titlePoChip = poNumber ? `PO-${poNumber.replace(/^PO[-\s]?/i, "").trim()}` : "";
  const ociChip = ociNumber ? `OCI-${ociNumber.replace(/^OCI[-\s]?/i, "").trim()}` : "";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4">
      <div className="relative h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Order Details – PO</h2>
            {titlePoChip && <Chip>{titlePoChip}</Chip>}
            {ociChip && <Chip>{ociChip}</Chip>}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-500">
              Created: <span className="font-medium">{formatDate(poRow?.created_date || poRow?.created)}</span>
            </div>
            <button
              className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex h-[calc(92vh-48px)] flex-col">
          <TabView
            poNumber={poNumber}
            totalChip={totalChip}
            items={items}
            loading={loading}
            comms={comms}
            commLoading={commLoading}
            onAddComm={handleAddComm}
            onDeleteComm={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}

function TabView({ poNumber, totalChip, items, loading, comms, commLoading, onAddComm, onDeleteComm }) {
  const [tab, setTab] = useState("items");
  return (
    <>
      <div className="border-b px-5">
        <nav className="flex gap-6">
          <button
            className={`-mb-px border-b-2 px-1.5 py-2 text-sm ${tab === "items" ? "border-indigo-500 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            onClick={() => setTab("items")}
          >
            Items
          </button>
          <button
            className={`-mb-px border-b-2 px-1.5 py-2 text-sm ${tab === "comms" ? "border-indigo-500 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            onClick={() => setTab("comms")}
          >
            Communications
          </button>
        </nav>
      </div>

      <div className="flex-1 overflow-auto p-5">
        {tab === "items" ? (
          <ItemsTab poNumber={poNumber} totalChip={totalChip} items={items} loading={loading} />
        ) : (
          <CommsTab
            poNumber={poNumber}
            comms={comms}
            loading={commLoading}
            onAdd={onAddComm}
            onDelete={onDeleteComm}
          />
        )}
      </div>
    </>
  );
}

function ItemsTab({ poNumber, totalChip, items, loading }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard label="PO Number">{poNumber || "—"}</StatCard>
        <div />
        <StatCard label="Total (USD)">{totalChip}</StatCard>
      </div>

      <div className="text-sm font-medium text-slate-700">Products</div>

      {loading && <div className="text-sm text-slate-500">Loading…</div>}

      {!loading && items.length === 0 && (
        <div className="text-sm text-slate-500">No items found.</div>
      )}

      <div className="space-y-4">
        {items.map((line, idx) => (
          <ProductBlock key={`${line.presentation_code}-${idx}`} line={line} />
        ))}
      </div>
    </div>
  );
}

function CommsTab({ poNumber, comms, loading, onAdd, onDelete }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Linked to <span className="font-medium">Orders</span> • <span className="font-semibold">{poNumber}</span>
        </div>
        <button
          onClick={onAdd}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Add
        </button>
      </div>

      {loading && <div className="text-sm text-slate-500">Loading…</div>}

      {(!loading && comms.length === 0) && (
        <div className="text-sm text-slate-500">No communications yet.</div>
      )}

      <div className="space-y-3">
        {comms.map((c) => {
          const idKey = c.id || `${c.created_date || c.created || c.date || ""}::${c.subject || ""}`;
          return (
            <div key={idKey} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-slate-900">{c.subject || "(no subject)"}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {c.type || "note"} • {c.participants || "—"}
                  </div>
                </div>
                <div className="text-xs text-slate-500">{formatDate(c.created_date || c.created || c.date)}</div>
              </div>

              <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                {c.content || c.preview || ""}
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Linked: orders • {poNumber}
                </div>
                <button
                  onClick={() => onDelete(c)}
                  className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-700"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
