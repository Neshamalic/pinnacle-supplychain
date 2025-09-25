// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import { useEffect, useMemo, useState } from "react";
import { API_BASE, fetchJSON, formatCurrency, formatDate } from "@/lib/utils";
// usa tu componente de comunicaciones (el mismo que usas en Tenders/Imports).
// Si tu nombre es distinto, solo cambia la importación de abajo.
import EntityCommunications from "@/components/communications/EntityCommunications";

function Badge({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export default function OrderDetailsModal({ open, onClose, order }) {
  const poNumber = String(order?.po_number ?? "").trim();
  const ociNumber = String(order?.oci_number ?? "").trim();

  const [loading, setLoading] = useState(true);
  const [rowsPO, setRowsPO] = useState([]);
  const [imports, setImports] = useState([]);
  const [importItems, setImportItems] = useState([]);
  const [master, setMaster] = useState([]);
  const [tab, setTab] = useState("items");

  useEffect(() => {
    if (!open || !poNumber) return;

    async function load() {
      setLoading(true);
      try {
        // Traemos todo y filtramos en cliente (tu Apps Script filtra solo communications).
        const [poRes, impRes, impItRes, masterRes] = await Promise.all([
          fetchJSON(`${API_BASE}?route=table&name=purchase_orders`),
          fetchJSON(`${API_BASE}?route=table&name=imports`),
          fetchJSON(`${API_BASE}?route=table&name=import_items`),
          // ojo: usa el nombre exacto de tu hoja de maestro
          fetchJSON(`${API_BASE}?route=table&name=product_presentation_master`)
            .catch(() => fetchJSON(`${API_BASE}?route=table&name=producto_presentation_master`)) // fallback por si tu hoja se llama distinto
        ]);

        setRowsPO((poRes?.rows || []).filter(r => String(r.po_number || "") === poNumber));
        setImports((impRes?.rows || []).filter(r =>
          String(r.oci_number || "") === ociNumber &&
          String(r.po_number || "") === poNumber
        ));
        setImportItems(impItRes?.rows || []);
        setMaster(masterRes?.rows || []);
      } finally {
        setLoading(false);
      }
    }
    load().catch(console.error);
  }, [open, poNumber, ociNumber]);

  // --- helpers ---
  const findMaster = (code) =>
    master.find(m =>
      String(m.presentation_code || m.product_code || m.sku || m.code || "")
        .trim().toLowerCase() === String(code || "").trim().toLowerCase()
    ) || {};

  const importHeader = useMemo(() => {
    // Tomamos el primer match del header de imports (suelen ser iguales para la OCI/PO)
    if (!imports.length) return {};
    const first = imports[0] || {};
    return {
      transport_type: String(first.transport_type || first.transport || "").toLowerCase(),
      import_status: String(first.import_status || first.status || "").toLowerCase(),
    };
  }, [imports]);

  // agrupamos líneas por presentation_code en purchase_orders
  const lines = useMemo(() => {
    const map = new Map();
    for (const r of rowsPO) {
      const code = String(r.presentation_code || r.product_code || r.sku || "").trim();
      if (!code) continue;

      const key = code;
      const prev = map.get(key) || {
        presentation_code: code,
        // del maestro
        product_name: "",
        package_units: null,
        // desde purchase_orders
        unit_price_usd: Number(r.cost_usd || r.unit_price_usd || r.unit_price || 0),
        requested: 0, // total_qty acumulado
      };

      prev.unit_price_usd = Number(
        r.cost_usd ?? r.unit_price_usd ?? prev.unit_price_usd ?? 0
      );
      prev.requested += Number(r.total_qty || r.ordered_qty || r.qty || 0);

      map.set(key, prev);
    }

    // completamos con maestro y con importados
    for (const [code, obj] of map.entries()) {
      const m = findMaster(code);
      obj.product_name = String(m.product_name || m.name || "");
      obj.package_units = Number(m.package_units || m.units_per_package || 0);

      // importe acumulado por oci + presentation_code
      const impSum = importItems.reduce((acc, it) => {
        const okOCI = String(it.oci_number || "").trim() === ociNumber;
        const okCode =
          String(it.presentation_code || it.product_code || it.sku || "")
            .trim()
            .toLowerCase() === code.toLowerCase();
        return okOCI && okCode ? acc + Number(it.qty || 0) : acc;
      }, 0);

      obj.imported = impSum;
      obj.remaining = Math.max(0, (obj.requested || 0) - (obj.imported || 0));

      map.set(code, obj);
    }

    return Array.from(map.values());
  }, [rowsPO, importItems, ociNumber, master]);

  const header = useMemo(() => {
    // Tender ref y created con la primera fila del PO
    const first = rowsPO[0] || {};
    const created = first.created_date || first.created || first.date_created;
    const tenderRef = first.tender_ref || first.tender_id || first.tender_number || "";
    const totalUsd = lines.reduce((acc, l) => acc + (Number(l.requested || 0) * Number(l.unit_price_usd || 0)), 0);

    return {
      tenderRef,
      created,
      totalUsd,
    };
  }, [rowsPO, lines]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* modal */}
      <div className="absolute inset-y-0 right-0 flex w-full max-w-5xl flex-col bg-white shadow-xl">
        {/* header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-slate-900">
              Order Details –{" "}
              {ociNumber ? `OCI-${ociNumber}` : "OCI-—"}{" "}
              / {poNumber ? `PO-${poNumber}` : "PO-—"}
            </h2>
            <div className="mt-1 text-sm text-slate-500">
              Created: {header.created ? formatDate(header.created) : "—"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-50"
          >
            ✕
          </button>
        </div>

        {/* tabs */}
        <div className="border-b px-6 pt-3">
          <nav className="flex gap-6">
            <button
              className={`pb-3 text-sm font-medium ${
                tab === "items"
                  ? "text-indigo-700 border-b-2 border-indigo-600"
                  : "text-slate-600 hover:text-slate-800"
              }`}
              onClick={() => setTab("items")}
            >
              Items
            </button>
            <button
              className={`pb-3 text-sm font-medium ${
                tab === "comms"
                  ? "text-indigo-700 border-b-2 border-indigo-600"
                  : "text-slate-600 hover:text-slate-800"
              }`}
              onClick={() => setTab("comms")}
            >
              Communications
            </button>
          </nav>
        </div>

        {/* content */}
        <div className="flex-1 overflow-auto p-6">
          {tab === "items" && (
            <>
              {/* header stats */}
              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Tender Ref" value={header.tenderRef || "—"} />
                <StatCard label="Created" value={header.created ? formatDate(header.created) : "—"} />
                <StatCard label="Total (USD)" value={formatCurrency(header.totalUsd || 0)} />
              </div>

              {/* products */}
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Products</h3>

              {loading && <div className="text-slate-500">Loading…</div>}

              {!loading && lines.length === 0 && (
                <div className="text-slate-500">No items found.</div>
              )}

              {!loading &&
                lines.map((l) => (
                  <div
                    key={l.presentation_code}
                    className="mb-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                  >
                    {/* title row */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-semibold text-slate-900">
                          {l.product_name || "—"}
                        </div>
                        <div className="text-xs text-slate-500">
                          Code: {l.presentation_code || "—"}
                          {l.package_units ? (
                            <> • {l.package_units} units/pack</>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* unit price */}
                        <div className="text-sm font-medium text-slate-700">
                          {formatCurrency(l.unit_price_usd || 0)}{" "}
                          <span className="text-xs text-slate-500">/ unit</span>
                        </div>
                      </div>
                    </div>

                    {/* chips row */}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <Badge className="bg-indigo-50 text-indigo-700">
                        {importHeader.transport_type || "—"}
                      </Badge>
                      <Badge className="bg-slate-100 text-slate-700">
                        {importHeader.import_status || "—"}
                      </Badge>
                    </div>

                    {/* stats row */}
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <StatCard
                        label="Requested"
                        value={new Intl.NumberFormat("en-US").format(l.requested || 0)}
                      />
                      <StatCard
                        label="Imported"
                        value={new Intl.NumberFormat("en-US").format(l.imported || 0)}
                      />
                      <StatCard
                        label="Remaining"
                        value={new Intl.NumberFormat("en-US").format(l.remaining || 0)}
                      />
                    </div>
                  </div>
                ))}
            </>
          )}

          {tab === "comms" && (
            <div className="mt-2">
              {/* Si tu componente tiene otro nombre/ruta, solo cámbialo aquí */}
              <EntityCommunications linkedType="orders" linkedId={poNumber} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
