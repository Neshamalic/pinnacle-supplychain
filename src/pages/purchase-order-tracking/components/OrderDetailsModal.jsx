// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import { useEffect, useMemo, useState } from "react";
import { API_BASE, fetchJSON, formatDate, formatCurrency } from "../../../lib/utils";

// Si ya tienes un componente reutilizable para communications, usa la ruta real de tu proyecto:
import CommunicationsList from "../../../components/communications/CommunicationsList";

function Pill({ children }) {
  return (
    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
      {children}
    </span>
  );
}

function Badge({ children }) {
  return (
    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
      {children}
    </span>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-800">{value ?? "—"}</div>
    </div>
  );
}

export default function OrderDetailsModal({ open, onClose, order }) {
  const poNumber = String(order?.po_number || order?.poNumber || "").trim();

  const [tab, setTab] = useState("items");
  const [poLines, setPoLines] = useState([]);     // líneas del PO desde purchase_orders (nuevo modelo)
  const [imports, setImports] = useState([]);     // filas de imports para el PO
  const [impItems, setImpItems] = useState([]);   // filas de import_items para el PO
  const [master, setMaster] = useState({});       // mapa presentation_code -> {name, units}

  // --------------- Carga de datos ---------------
  useEffect(() => {
    if (!poNumber) return;

    let abort = false;

    async function load() {
      try {
        // 1) Todas las filas del PO (ahora cada fila es una línea con presentation_code, total_qty, cost_usd, oci_number, etc.)
        // Si tu Apps Script aún no filtra por ?po=..., filtramos en el cliente.
        const poRes = await fetchJSON(`${API_BASE}?route=table&name=purchase_orders`);
        if (!poRes?.ok) throw new Error(poRes?.error || "Error loading purchase_orders");
        const lines = (poRes.rows || []).filter(r => String(r.po_number || "").trim() === poNumber);

        // 2) Imports del PO (el Apps Script que compartiste sí admite ?po= en 'imports')
        const imRes = await fetchJSON(`${API_BASE}?route=table&name=imports&po=${encodeURIComponent(poNumber)}`);
        const imRows = imRes?.ok ? (imRes.rows || []) : [];

        // 3) import_items del PO (también soportado por el Apps Script)
        const iiRes = await fetchJSON(`${API_BASE}?route=table&name=import_items&po=${encodeURIComponent(poNumber)}`);
        const iiRows = iiRes?.ok ? (iiRes.rows || []) : [];

        // 4) maestro de presentaciones (nombre y unidades por pack)
        // Intentamos con un nombre de hoja estándar; si en tu libro tiene otro nombre, crea un alias con el mismo encabezado.
        let mRows = [];
        try {
          const m1 = await fetchJSON(`${API_BASE}?route=table&name=product_presentation_master`);
          if (m1?.ok) mRows = m1.rows || [];
        } catch {}
        if (!mRows.length) {
          try {
            const m2 = await fetchJSON(`${API_BASE}?route=table&name=producto_presentation_master`);
            if (m2?.ok) mRows = m2.rows || [];
          } catch {}
        }
        const mMap = {};
        for (const r of mRows) {
          const code = String(r.presentation_code || r.product_code || r.sku || r.code || "").trim();
          if (!code) continue;
          mMap[code] = {
            name: String(r.product_name || r.name || "").trim(),
            units: Number(r.package_units || r.units_per_pack || r.units_per_package || r.units || 0) || undefined,
          };
        }

        if (abort) return;
        setPoLines(lines);
        setImports(imRows);
        setImpItems(iiRows);
        setMaster(mMap);
      } catch (err) {
        console.error("OrderDetails load error:", err);
      }
    }

    load();
    return () => { abort = true; };
  }, [poNumber]);

  // --------------- Derivados / enriquecimiento ---------------
  const ociInHeader = useMemo(() => {
    const set = new Set((poLines || []).map(r => String(r.oci_number || "").trim()).filter(Boolean));
    return Array.from(set)[0] || ""; // si hay varios OCI, mostramos el primero
  }, [poLines]);

  const headerCreated = useMemo(() => {
    // Toma la primera fecha válida (todas las filas del PO deberían tener la misma)
    const row = poLines[0] || order || {};
    const iso = row.created_date || row.created || order?.created_date || "";
    return formatDate(iso);
  }, [poLines, order]);

  // Enriquecemos cada línea (producto) con: nombre, unidades/pack, import status & transport, importado y remaining
  const items = useMemo(() => {
    if (!poLines?.length) return [];

    return poLines
      .filter(r => String(r.presentation_code || "").trim()) // aseguramos que sea una línea de producto
      .map(r => {
        const code = String(r.presentation_code).trim();

        // Maestro
        const m = master[code] || {};
        const productName = m.name || code;
        const packUnits = m.units;

        // Precios / cantidades en tu nuevo modelo
        const unitPrice =
          Number(r.cost_usd || r.unit_price_usd || r.unit_price || 0) || 0;
        const requested =
          Number(r.total_qty || r.ordered_qty || r.qty || r.quantity || 0) || 0;

        // Import status + transport por OCI de esta línea
        const oci = String(r.oci_number || "").trim();
        const im = (imports || []).find(x =>
          String(x.oci_number || "").trim() === oci ||
          (String(x.po_number || "").trim() === poNumber && !oci) // fallback si no tuviera oci_number en imports
        ) || {};
        const importStatus = String(im.import_status || im.status || "").toLowerCase();
        const transport = String(im.transport_type || im.transport || "").toLowerCase();

        // Importado (sumatoria en import_items por oci + presentation_code; si en tu hoja también hay po_number lo usamos)
        const imported = (impItems || [])
          .filter(ii =>
            (oci ? String(ii.oci_number || "").trim() === oci : true) &&
            String(ii.presentation_code || "").trim() === code &&
            (String(ii.po_number || "").trim() === poNumber || !ii.po_number)
          )
          .reduce((acc, ii) => acc + (Number(ii.qty || ii.quantity || 0) || 0), 0);

        const remaining = Math.max(0, requested - imported);

        return {
          code,
          productName,
          packUnits,
          unitPrice,
          requested,
          imported,
          remaining,
          importStatus,
          transport,
          oci,
        };
      });
  }, [poLines, master, imports, impItems, poNumber]);

  // Total USD del pedido (suma unitPrice * requested, como referencia rápida)
  const totalUSD = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.unitPrice * it.requested || 0), 0);
  }, [items]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4">
      <div className="mx-auto w-full max-w-5xl rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="min-w-0">
            <div className="flex items-center">
              <h2 className="truncate text-xl font-semibold text-slate-900">
                Order Details — {ociInHeader ? `OCI-${ociInHeader} / ` : ""}PO-{poNumber}
              </h2>
              <Pill>PO-{poNumber}</Pill>
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Created: {headerCreated || "—"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b px-4 pt-2">
          <nav className="-mb-px flex gap-6">
            <button
              className={`border-b-2 px-2 pb-2 text-sm ${
                tab === "items"
                  ? "border-indigo-500 font-medium text-indigo-600"
                  : "border-transparent text-slate-600 hover:text-slate-800"
              }`}
              onClick={() => setTab("items")}
            >
              Items
            </button>
            <button
              className={`border-b-2 px-2 pb-2 text-sm ${
                tab === "comms"
                  ? "border-indigo-500 font-medium text-indigo-600"
                  : "border-transparent text-slate-600 hover:text-slate-800"
              }`}
              onClick={() => setTab("comms")}
            >
              Communications
            </button>
          </nav>
        </div>

        {/* Content */}
        {tab === "items" ? (
          <div className="space-y-4 p-6">
            {/* Resumen */}
            <div className="grid gap-4 sm:grid-cols-3">
              <StatBox label="PO Number" value={poNumber || "—"} />
              <StatBox label="Created" value={headerCreated || "—"} />
              <StatBox label="Total (USD)" value={formatCurrency(totalUSD)} />
            </div>

            {/* Lista de productos */}
            {!items.length ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
                No items found.
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((it, idx) => (
                  <div
                    key={`${it.code}-${idx}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                  >
                    {/* Encabezado del producto */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm text-slate-500">
                          Code: <span className="font-medium text-slate-700">{it.code}</span>
                          {it.packUnits ? (
                            <span className="ml-2
