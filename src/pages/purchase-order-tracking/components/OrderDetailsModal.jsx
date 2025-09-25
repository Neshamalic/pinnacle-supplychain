import { useEffect, useMemo, useState } from "react";
import { API_BASE, fetchJSON, formatDate, formatNumber } from "../../../lib/utils";

// ⬅️ Si ya tienes tu componente real de comunicaciones, impórtalo aquí y
//     reemplaza el bloque <PlaceholderComms /> de más abajo.
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

/* ===================== helpers robustos ===================== */
async function getSheetRowsAny(names) {
  for (const name of names) {
    try {
      const url = `${API_BASE}?route=table&name=${encodeURIComponent(name)}`;
      const r = await fetchJSON(url);
      if (r?.ok && Array.isArray(r.rows) && r.rows.length) {
        console.log(`[OrderDetailsModal] Cargada hoja "${name}" con`, r.rows.length, "filas");
        return r.rows;
      }
      console.warn(`[OrderDetailsModal] Hoja "${name}" vacía o sin filas`);
    } catch (e) {
      console.warn(`[OrderDetailsModal] Error leyendo hoja "${name}":`, e);
    }
  }
  return [];
}

function pick(obj, keys, d = "") {
  for (const k of keys) {
    const v = obj?.[k];
    if (v != null && v !== "") return v;
  }
  return d;
}
const s = (v) => String(v ?? "").trim();
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* ===================== Modal principal ===================== */
export default function OrderDetailsModal({ open, onClose, order }) {
  const [loading, setLoading] = useState(true);

  const [rowsPO, setRowsPO] = useState([]);        // líneas de purchase_orders (filtradas por PO)
  const [imports, setImports] = useState([]);      // hoja imports (toda)
  const [importItems, setImportItems] = useState([]); // hoja import_items (toda)
  const [masterMap, setMasterMap] = useState({});  // code -> { name, units }

  const poNumber = s(pick(order, ["po_number", "poNumber", "po", "id"]));

  useEffect(() => {
    if (!open || !poNumber) return;

    (async () => {
      setLoading(true);

      // 1) purchase_orders (con sinónimos)
      const allPO = await getSheetRowsAny([
        "purchase_orders",
        "purchase-orders",
        "orders",
        "po",
      ]);

      // filtramos por po_number con tolerancia de alias
      const poRows = (allPO || []).filter((r) => {
        const rPo = s(pick(r, ["po_number", "po", "poNumber", "id"]));
        return rPo === poNumber;
      });

      // 2) product master (con sinónimos)
      const master = await getSheetRowsAny([
        "product_presentation_master",
        "producto_presentation_master",
        "presentation_master",
        "product_master",
      ]);
      const map = {};
      for (const row of master) {
        const code = s(pick(row, ["presentation_code", "product_code", "code"]));
        if (!code) continue;
        map[code] = {
          product_name: s(pick(row, ["product_name", "name", "presentation_name"], code)),
          package_units: n(pick(row, ["package_units", "units_per_package", "units", "pack_units"])),
        };
      }

      // 3) imports + import_items
      const importsRows = await getSheetRowsAny(["imports", "importes"]);
      const impItems = await getSheetRowsAny(["import_items", "import-items", "import_lines"]);

      setRowsPO(poRows);
      setImports(importsRows);
      setImportItems(impItems);
      setMasterMap(map);

      console.log("[OrderDetailsModal] PO filtrado:", poNumber, " =>", poRows.length, "líneas");
      setLoading(false);
    })();
  }, [open, poNumber]);

  // OCI en encabezado: toma el primero que encuentre
  const headerOci = useMemo(() => {
    return s(pick(rowsPO.find((r) => s(r.oci_number)) || {}, ["oci_number"]));
  }, [rowsPO]);

  const createdDate = useMemo(() => {
    const raw = pick(rowsPO.find((r) => r.created_date) || order || {}, ["created_date", "created"]);
    return formatDate(raw);
  }, [rowsPO, order]);

  const tenderRef = useMemo(() => s(pick(rowsPO[0] || order || {}, ["tender_ref"])), [rowsPO, order]);

  // Construcción de items desde la propia purchase_orders (una por fila)
  const items = useMemo(() => {
    return rowsPO.map((row) => {
      const presentationCode = s(pick(row, ["presentation_code", "product_code", "code"]));
      const oci = s(pick(row, ["oci_number", "oci"]));

      // master
      const m = masterMap[presentationCode] || {};
      const productName = m.product_name || s(pick(row, ["product_name"], presentationCode));
      const packageUnits = m.package_units || undefined;

      // import status / transport (por OCI o por PO si no hay OCI)
      const imp = imports.find(
        (r) =>
          (oci && s(r.oci_number) === oci) || s(pick(r, ["po_number", "po"])) === poNumber
      );
      const importStatus = s(pick(imp || {}, ["import_status", "status"])).toLowerCase();
      const transportType = s(pick(imp || {}, ["transport_type", "transport"])).toLowerCase();

      // cantidades y costos
      const requested = n(pick(row, ["total_qty", "ordered_qty", "qty", "quantity"]));
      const unitPrice = n(pick(row, ["cost_usd", "unit_price", "price"]));

      // suma importada: import_items por (oci_number, presentation_code)
      const imported = importItems
        .filter(
          (ii) =>
            s(pick(ii, ["oci_number", "oci"])) === oci &&
            s(pick(ii, ["presentation_code", "product_code", "code"])) === presentationCode
        )
        .reduce((acc, ii) => acc + n(pick(ii, ["qty", "quantity"])), 0);

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
  }, [rowsPO, imports, importItems, masterMap, poNumber]);

  const totalUsd = useMemo(
    () => items.reduce((acc, it) => acc + it.unitPrice * it.requested, 0),
    [items]
  );

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
            // Reemplaza este placeholder por tu componente real de comunicaciones
            // <CommunicationsSection entity="orders" entityId={poNumber} />
            <PlaceholderComms poNumber={poNumber} />
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
          <div className="p-8 text-sm text-slate-500">Loading… (revisa consola si tarda)</div>
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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatBox label="PO Number" value={poNumber || "—"} />
        <StatBox label="Created" value={createdDate || "—"} />
        <StatBox label="Total (USD)" value={`$${formatNumber(totalUsd)}`} />
      </div>

      {!items.length && (
        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          No items found. (Abre la consola del navegador: debe aparecer qué hojas y cuántas filas se cargaron)
        </div>
      )}

      <div className="space-y-4">
        {items.map((it, idx) => (
          <div key={`${it.presentationCode}-${idx}`} className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
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
                <div className="mt-1 text-xs text-slate-500">Code: {it.presentationCode}</div>
              </div>

              <div className="flex items-center gap-2">
                {Number.isFinite(it.unitPrice) && it.unitPrice > 0 ? (
                  <span className="text-sm font-semibold text-slate-700">
                    ${it.unitPrice.toFixed(2)} <span className="text-xs">/ unit</span>
                  </span>
                ) : null}
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

function PlaceholderComms({ poNumber }) {
  return (
    <div className="p-6 text-sm text-slate-600">
      <p>
        Aquí va el componente <strong>Communications</strong> enlazado a:
        <code className="ml-1 rounded bg-slate-100 px-1">entity="orders"</code>
        <code className="ml-1 rounded bg-slate-100 px-1">entityId="{poNumber}"</code>
      </p>
      <p className="mt-2">Sustituye este bloque con tu componente de comunicaciones real.</p>
    </div>
  );
}
