// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import { useEffect, useMemo, useState } from "react";
import { API_BASE, fetchJSON, formatDate, formatNumber } from "../../../lib/utils";

// ⬇️ Si tu bloque de comunicaciones tiene otro nombre/ruta, ajusta esta importación
// import CommunicationsSection from "@/components/communications/CommunicationsSection";

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-800">{value}</div>
    </div>
  );
}

// util seguro: intenta varias hojas y si falla, devuelve []
async function safeTable(name) {
  try {
    const r = await fetchJSON(`${API_BASE}?route=table&name=${encodeURIComponent(name)}`);
    return r?.ok ? (r.rows || []) : [];
  } catch {
    return [];
  }
}

export default function OrderDetailsModal({ open, onClose, order }) {
  const [loading, setLoading] = useState(true);
  const [poRows, setPoRows] = useState([]);               // líneas de purchase_orders (filtradas por PO)
  const [importsRows, setImportsRows] = useState([]);     // hoja imports
  const [importItems, setImportItems] = useState([]);     // hoja import_items
  const [masterMap, setMasterMap] = useState({});         // code -> { product_name, package_units }

  const poNumber = String(order?.po_number || order?.poNumber || "").trim();

  useEffect(() => {
    if (!open || !poNumber) return;

    (async () => {
      setLoading(true);

      // 1) purchase_orders (todas), luego filtramos por po_number
      const allPO = await safeTable("purchase_orders");
      const lines = (allPO || []).filter(r => String(r.po_number || "").trim() === poNumber);

      // 2) producto master (intenta nombres alternativos)
      const m1 = await safeTable("product_presentation_master");
      const m2 = m1.length ? [] : await safeTable("producto_presentation_master");
      const m3 = (m1.length || m2.length) ? [] : await safeTable("presentation_master");
      const master = [...m1, ...m2, ...m3];
      const map = {};
      for (const row of master) {
        const code = String(row.product_code || row.presentation_code || row.code || "").trim();
        if (!code) continue;
        map[code] = {
          product_name: String(row.product_name || row.name || "").trim(),
          package_units: Number(row.package_units || row.units_per_package || row.units || 0) || undefined,
        };
      }

      // 3) imports + import_items (para estado y cantidad importada)
      const imps = await safeTable("imports");
      const impItems = await safeTable("import_items");

      setPoRows(lines);
      setImportsRows(imps);
      setImportItems(impItems);
      setMasterMap(map);

      setLoading(false);
    })();
  }, [open, poNumber]);

  // OCI visible en encabezado: toma el primero que encuentre en las líneas de PO
  const headerOci = useMemo(() => {
    const oci = poRows.find(r => String(r.oci_number || "").trim())?.oci_number;
    return String(oci || "").trim();
  }, [poRows]);

  // Datos de cabecera
  const createdDate = useMemo(() => {
    // puede venir en cada línea; usamos la primera con valor
    const raw = poRows.find(r => r.created_date)?.created_date || order?.created_date;
    return formatDate(raw);
  }, [poRows, order]);

  const tenderRef = useMemo(() => {
    return String(
      poRows.find(r => r.tender_ref)?.tender_ref ||
      order?.tender_ref ||
      ""
    ).trim();
  }, [poRows, order]);

  // Construcción de items (una por presentation_code dentro del mismo PO)
  const items = useMemo(() => {
    if (!poRows.length) return [];

    return poRows.map((row) => {
      const presentationCode = String(row.presentation_code || row.product_code || row.code || "").trim();
      const oci = String(row.oci_number || headerOci || "").trim();

      // master
      const m = masterMap[presentationCode] || {};
      const productName = m.product_name || String(row.product_name || "").trim() || presentationCode;
      const packageUnits = m.package_units;

      // import status / transport: busca en imports por oci (o por po si no hubiera oci)
      const imp = importsRows.find(r =>
        (oci && String(r.oci_number || "").trim() === oci) ||
        String(r.po_number || "").trim() === poNumber
      );
      const importStatus = String(imp?.import_status || "").toLowerCase();
      const transportType = String(imp?.transport_type || "").toLowerCase();

      // cantidades y costos
      const requested = Number(row.total_qty || row.ordered_qty || row.qty || 0) || 0;
      const unitPrice = Number(row.cost_usd || row.unit_price || 0) || 0;

      // suma importada: import_items por (oci_number, presentation_code)
      const imported = importItems
        .filter(ii =>
          String(ii.oci_number || "").trim() === oci &&
          String(ii.presentation_code || ii.product_code || "").trim() === presentationCode
        )
        .reduce((acc, ii) => acc + (Number(ii.qty || 0) || 0), 0);

      const remaining = Math.max(0, requested - imported);

      return {
        presentationCode,
        productName,
        packageUnits,
        importStatus,
        transportType,
        unitPrice,
        requested,
        imported,
        remaining,
        oci,
      };
    });
  }, [poRows, headerOci, importsRows, importItems, masterMap, poNumber]);

  const totalUsd = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.unitPrice * it.requested), 0);
  }, [items]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/20 p-4">
      <div className="relative h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-900">
              Order Details – {headerOci ? `OCI-${headerOci} / ` : ""}PO-{poNumber}
            </h2>
            {tenderRef && <Badge>{tenderRef}</Badge>}
          </div>
          <div className="text-sm text-slate-500">
            Created: <span className="font-medium text-slate-700">{createdDate || "—"}</span>
          </div>
          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <Tabs
          itemsTab={
            <ItemsTab
              items={items}
              poNumber={poNumber}
              createdDate={createdDate}
              totalUsd={totalUsd}
            />
          }
          commsTab={
            // ⬇️ Usa tu propio componente de comunicaciones si ya lo tenías
            // <CommunicationsSection entity="orders" entityId={poNumber} />
            <div className="p-6 text-sm text-slate-600">
              <p>
                Aquí va tu componente de <strong>Communications</strong> enlazado a:
                <code className="ml-1 rounded bg-slate-100 px-1">entity="orders"</code>
                <code className="ml-1 rounded bg-slate-100 px-1">entityId="{poNumber}"</code>
              </p>
              <p className="mt-2">
                Si ya lo usas en Tenders/Imports, importa ese mismo componente y reemplaza este bloque.
              </p>
            </div>
          }
          loading={loading}
        />
      </div>
    </div>
  );
}

function Tabs({ itemsTab, commsTab, loading }) {
  const [tab, setTab] = useState("items");
  return (
    <>
      <div className="flex items-center gap-6 border-b px-6">
        <button
          className={`-mb-px border-b-2 px-1.5 py-3 text-sm ${
            tab === "items"
              ? "border-violet-600 font-medium text-violet-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
          onClick={() => setTab("items")}
        >
          Items
        </button>
        <button
          className={`-mb-px border-b-2 px-1.5 py-3 text-sm ${
            tab === "comms"
              ? "border-violet-600 font-medium text-violet-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
          onClick={() => setTab("comms")}
        >
          Communications
        </button>
      </div>

      <div className="h-[calc(90vh-4rem)] overflow-auto">
        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading…</div>
        ) : tab === "items" ? (
          itemsTab
        ) : (
          commsTab
        )}
      </div>
    </>
  );
}

function ItemsTab({ items, poNumber, createdDate, totalUsd }) {
  return (
    <div className="space-y-6 p-6">
      {/* Resumen superior */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatBox label="PO Number" value={poNumber || "—"} />
        <StatBox label="Created" value={createdDate || "—"} />
        <StatBox label="Total (USD)" value={`$${formatNumber(totalUsd)}`} />
      </div>

      {/* Lista de productos */}
      {!items.length && (
        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          No items found.
        </div>
      )}

      <div className="space-y-4">
        {items.map((it, idx) => (
          <div
            key={`${it.presentationCode}-${idx}`}
            className="rounded-xl border border-slate-200 bg-slate-50/60 p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-semibold text-slate-900">
                  {it.productName}
                  {it.packageUnits ? (
                    <span className="ml-2 text-sm font-medium text-slate-500">
                      • {it.packageUnits} units/pack
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Code: {it.presentationCode}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {it.unitPrice ? (
                  <span className="text-sm font-semibold text-slate-700">
                    ${it.unitPrice.toFixed(2)} <span className="text-xs">/ unit</span>
                  </span>
                ) : null}
                {/* Botón Edit (placeholder visual) */}
                {/* <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                  Edit
                </button> */}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {it.importStatus && <Badge>{it.importStatus}</Badge>}
              {it.transportType && <Badge>{it.transportType}</Badge>}
              {it.oci && <Badge>OCI {it.oci}</Badge>}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <StatBox label="Requested" value={formatNumber(it.requested)} />
              <StatBox label="Imported" value={formatNumber(it.imported)} />
              <StatBox label="Remaining" value={formatNumber(it.remaining)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

