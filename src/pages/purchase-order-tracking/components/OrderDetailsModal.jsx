// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import { useEffect, useMemo, useState } from "react";
import { API_BASE, fetchJSON, formatCurrency, formatDate } from "../../../lib/utils";

// Helpers
const toNum = (v) => {
  const s = String(v ?? "").replace(/\./g, "").replace(/,/g, ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
      {children}
    </span>
  );
}

function CardStat({ label, value }) {
  return (
    <div className="flex flex-col rounded-xl border bg-slate-50 px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-slate-800">{value ?? "—"}</div>
    </div>
  );
}

export default function OrderDetailsModal({ open, onClose, order }) {
  const po = order?.po_number || order?.po || "";
  const [tab, setTab] = useState("items");

  // datasets
  const [poRows, setPoRows] = useState([]); // todas las filas de purchase_orders
  const [imports, setImports] = useState([]); // hoja imports
  const [importItems, setImportItems] = useState([]); // hoja import_items
  const [ppMaster, setPpMaster] = useState([]); // product_presentation_master (o producto_presentation_master)
  const [comms, setComms] = useState([]); // communications (filtradas)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !po) return;

    (async () => {
      setLoading(true);
      try {
        // 1) purchase_orders (ahora incluye las líneas)
        const poRes = await fetchJSON(`${API_BASE}?route=table&name=purchase_orders`);
        console.log("[OrderDetailsModal] purchase_orders rows:", poRes?.rows?.length);
        const allPO = poRes?.rows ?? [];

        // 2) imports (para traer estado de importación y transporte por oci_number)
        const impRes = await fetchJSON(`${API_BASE}?route=table&name=imports`);
        console.log("[OrderDetailsModal] imports rows:", impRes?.rows?.length);
        const allImports = impRes?.rows ?? [];

        // 3) import_items (para sumar qty importada por oci_number + presentation_code)
        const iiRes = await fetchJSON(`${API_BASE}?route=table&name=import_items`);
        console.log("[OrderDetailsModal] import_items rows:", iiRes?.rows?.length);
        const allImpItems = iiRes?.rows ?? [];

        // 4) product presentation master (puede llamarse product_presentation_master o producto_presentation_master)
        let ppm = [];
        try {
          const ppm1 = await fetchJSON(`${API_BASE}?route=table&name=product_presentation_master`);
          ppm = ppm1?.rows ?? [];
          console.log("[OrderDetailsModal] product_presentation_master rows:", ppm.length);
        } catch {
          try {
            const ppm2 = await fetchJSON(`${API_BASE}?route=table&name=producto_presentation_master`);
            ppm = ppm2?.rows ?? [];
            console.log("[OrderDetailsModal] producto_presentation_master rows:", ppm.length);
          } catch {
            console.warn("[OrderDetailsModal] No se encontró product(o)_presentation_master");
          }
        }

        // 5) communications filtradas por orders + po_number
        const commsRes = await fetchJSON(
          `${API_BASE}?route=table&name=communications&lt=orders&lid=${encodeURIComponent(po)}&order=desc&limit=200`
        );
        console.log("[OrderDetailsModal] communications (orders, this PO):", commsRes?.rows?.length);

        setPoRows(allPO);
        setImports(allImports);
        setImportItems(allImpItems);
        setPpMaster(ppm);
        setComms(commsRes?.rows ?? []);
      } catch (err) {
        console.error("[OrderDetailsModal] Load error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, po]);

  // Filas de esta PO (cada fila es un presentation_code con total_qty, cost_usd, oci_number, etc.)
  const lines = useMemo(() => {
    const list = (poRows || []).filter(
      (r) => String(r.po_number || r.po || "").trim() === String(po).trim()
    );

    console.log(`[OrderDetailsModal] PO ${po} -> ${list.length} líneas en purchase_orders`);

    // Enriquecemos cada línea
    const byKey = (o) => String(o.presentation_code || o.product_code || o.sku || "").trim();

    return (list || []).map((row) => {
      const oci = String(row.oci_number || row.oci || "").trim();
      const code = byKey(row);

      // nombre & units desde master
      const m =
        (ppMaster || []).find(
          (x) =>
            String(x.presentation_code || x.product_code || x.sku || "").trim() === code
        ) || {};
      const productName = String(m.product_name || m.name || "").trim();
      const packageUnits = toNum(m.package_units || m.units_per_pack || m.units);

      // estado/transport desde imports por oci_number
      const imp =
        (imports || []).find(
          (x) => String(x.oci_number || x.oci || "").trim() === oci
        ) || {};
      const importStatus = String(imp.import_status || imp.status || "").toLowerCase();
      const transportType = String(imp.transport_type || imp.transport || "").toLowerCase();

      // qty importada desde import_items por oci + presentation_code
      const imported = (importItems || [])
        .filter(
          (x) =>
            String(x.oci_number || x.oci || "").trim() === oci &&
            byKey(x) === code
        )
        .reduce((acc, x) => acc + toNum(x.qty || x.quantity), 0);

      const requested = toNum(row.total_qty || row.requested_qty || row.ordered_qty || row.qty);
      const remaining = Math.max(0, requested - imported);

      const unitUsd =
        toNum(row.cost_usd || row.unit_price_usd || row.unit_price || row.price);
      const lineTotal = unitUsd * requested;

      return {
        ociNumber: oci,
        presentationCode: code,
        productName,
        packageUnits,
        unitUsd,
        importStatus,
        transportType,
        requested,
        imported,
        remaining,
        lineTotal,
      };
    });
  }, [poRows, po, ppMaster, imports, importItems]);

  // Cabecera: tomamos la 1ª fila de la PO
  const head = useMemo(() => {
    const row = (poRows || []).find(
      (r) => String(r.po_number || r.po || "").trim() === String(po).trim()
    );
    if (!row) return {};
    return {
      poNumber: row.po_number || row.po,
      ociNumber: row.oci_number || row.oci,
      tenderRef: row.tender_ref || row.tender || "",
      createdDate: row.created_date || row.created || row.date_created || "",
    };
  }, [poRows, po]);

  const totalUSD = useMemo(
    () => lines.reduce((s, x) => s + x.lineTotal, 0),
    [lines]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/20 p-4">
      <div className="mx-auto w-full max-w-6xl rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">
              Order Details – PO
            </h2>
            {head.poNumber ? <Badge>{head.poNumber}</Badge> : null}
            {head.ociNumber ? <Badge>OCI {head.ociNumber}</Badge> : null}
          </div>
          <div className="text-sm text-slate-500">
            Created: {formatDate(head.createdDate)}
          </div>
          <button
            onClick={onClose}
            className="ml-4 inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b px-6 pt-3">
          <div className="flex gap-6">
            <button
              className={`-mb-px border-b-2 px-1 pb-3 text-sm ${
                tab === "items"
                  ? "border-violet-500 font-medium text-violet-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setTab("items")}
            >
              Items
            </button>
            <button
              className={`-mb-px border-b-2 px-1 pb-3 text-sm ${
                tab === "comms"
                  ? "border-violet-500 font-medium text-violet-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setTab("comms")}
            >
              Communications
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {tab === "items" && (
            <>
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <CardStat label="PO Number" value={head.poNumber || "—"} />
                <CardStat label="Created" value={formatDate(head.createdDate)} />
                <CardStat label="Total (USD)" value={formatCurrency(totalUSD)} />
              </div>

              {loading && (
                <div className="py-16 text-center text-slate-500">Loading…</div>
              )}

              {!loading && lines.length === 0 && (
                <div className="py-12 text-center text-slate-500">
                  No items found.
                </div>
              )}

              <div className="space-y-4">
                {lines.map((it) => (
                  <div
                    key={`${it.ociNumber}::${it.presentationCode}`}
                    className="rounded-2xl border bg-slate-50 px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-semibold text-slate-900">
                          {it.productName || it.presentationCode}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          Code: {it.presentationCode}
                          {it.packageUnits ? ` • ${it.packageUnits} units/pack` : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate-500">{formatCurrency(it.unitUsd)}</span>
                        <span className="text-slate-400">/ unit</span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      {it.importStatus ? <Badge>{it.importStatus}</Badge> : null}
                      {it.transportType ? <Badge>{it.transportType}</Badge> : null}
                      {it.ociNumber ? <Badge>OCI {it.ociNumber}</Badge> : null}
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <CardStat label="Requested" value={it.requested.toLocaleString()} />
                      <CardStat label="Imported" value={it.imported.toLocaleString()} />
                      <CardStat label="Remaining" value={it.remaining.toLocaleString()} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === "comms" && (
            <div className="space-y-3">
              {comms.length === 0 && (
                <div className="py-12 text-center text-slate-500">
                  No communications for this PO.
                </div>
              )}

              {comms.map((c) => (
                <div key={c.id || c._virtual_id} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <div className="truncate font-medium">{c.subject || "(no subject)"}</div>
                    <div className="text-xs text-slate-500">
                      {formatDate(c.created_date || c.created || c.date)}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {c.type} • {c.participants}
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                    {c.content || c.preview}
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    Linked: orders • {po}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

