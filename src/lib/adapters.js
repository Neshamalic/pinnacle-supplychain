// src/lib/adapters.js
// ============================================================
// Helpers seguros (strings, números, fechas y "pick" de claves)
// ============================================================
const S = (v) => (v ?? "").toString().trim();
const N = (v, fallback = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
};
const pick = (row, keys = []) => {
  for (const k of keys) {
    if (row?.[k] != null && row[k] !== "") return row[k];
  }
  return undefined;
};
const toISO = (v) => {
  try {
    if (!v) return "";
    const d = new Date(v);
    return isNaN(d.getTime()) ? "" : d.toISOString();
  } catch { return ""; }
};
const toBool = (v) => {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y";
};

// ============================================================
// PURCHASE ORDERS  (hoja: purchase_orders)
// ============================================================
export function mapPurchaseOrders(r = {}) {
  return {
    id: r.id ?? S(r.po_number ?? r.poNumber),
    poNumber: S(r.po_number ?? r.poNumber),
    presentationCode: S(r.presentation_code ?? r.presentationCode ?? r.code),
    productName: S(r.product_name ?? r.product),
    quantity: N(r.quantity ?? r.qty ?? r.units),
    unitPriceUsd: N(r.unit_price_usd ?? r.unitPriceUsd),
    totalUsd: N(r.total_usd ?? r.totalUsd ?? (N(r.unit_price_usd) * N(r.quantity))),
    ociNumber: S(r.oci_number ?? r.oci),
    status: S(r.status).toLowerCase(),
    createdDate: toISO(r.created_date ?? r.created),
    _raw: r,
  };
}

// ============================================================
// PURCHASE ORDER ITEMS (alias, por compatibilidad de vistas)
// Si alguna vista pide "items", mapeamos igual desde purchase_orders
// ============================================================
export function mapPurchaseOrderItems(r = {}) {
  return {
    id: r.id ?? `${S(r.po_number ?? r.poNumber)}-${S(r.presentation_code ?? r.presentationCode)}`,
    poNumber: S(r.po_number ?? r.poNumber),
    presentationCode: S(r.presentation_code ?? r.presentationCode),
    quantity: N(r.quantity ?? r.qty ?? r.units),
    unitPriceUsd: N(r.unit_price_usd ?? r.unitPriceUsd),
    totalUsd: N(r.total_usd ?? r.totalUsd),
    _raw: r,
  };
}

// ============================================================
// TENDERS  (si usas licitaciones)
// ============================================================
export function mapTenders(r = {}) {
  return {
    id: r.tender_id ?? r.tender_number ?? S(r.id ?? r.tender),
    tenderNumber: S(r.tender_number ?? r.tenderNumber),
    title: S(r.title),
    status: S(r.status).toLowerCase(),
    deliveryDate: r.delivery_date ?? r.deliveryDate ?? "",
    _raw: r,
  };
}

// ============================================================
// IMPORTS  (hojas: imports, import_items)
// ============================================================
export function mapImports(r = {}) {
  return {
    id: r.id ?? S(r.oci_number ?? r.oci ?? r.shipment_id),
    ociNumber: S(r.oci_number ?? r.oci ?? r.shipment_id),
    transportType: S(r.transport_type ?? r.transport ?? r.mode).toLowerCase(),
    eta: toISO(r.eta ?? r.arrival_date ?? r.arrival),
    status: S(r.status ?? r.import_status ?? r.customs_status).toLowerCase(),
    totalCostClp: N(r.total_cost_clp ?? r.cost_clp ?? r.amount_clp),
    totalCostUsd: N(r.total_cost_usd ?? r.cost_usd ?? r.amount_usd),
    createdDate: toISO(r.created_date ?? r.created),
    _raw: r,
  };
}

export const mapImportItems = (r = {}) => ({
  shipmentId: S(pick(r, ["shipment_id", "shipment"])),
  ociNumber: S(pick(r, ["oci_number", "oci"]) ?? ""),
  poNumber: S(pick(r, ["po_number", "po"]) ?? ""),
  productCode: S(pick(r, ["product_code", "presentation_code", "sku", "code"]) ?? ""),
  lotNumber: S(pick(r, ["lot_number", "lot"]) ?? ""),
  qty: N(pick(r, ["qty", "quantity", "units"])),
  unitPrice: N(pick(r, ["unit_price", "price"])),
  currency: S(pick(r, ["currency", "curr"]) ?? "CLP").toUpperCase(),
  qcStatus: S(pick(r, ["qc_status", "quality_status", "qc"]) ?? "").toLowerCase(),
  _raw: r,
});

// ============================================================
// DEMAND  (hoja: demand)
// ============================================================
export const mapDemand = (r = {}) => ({
  monthOfSupply: S(pick(r, ["month_of_supply", "month"]) ?? ""),
  presentationCode: S(pick(r, ["presentation_code", "sku", "code"]) ?? ""),
  productName: S(r.product ?? r.product_name ?? r.name),
  packageSize: N(r.package_size, null),
  monthlyDemandUnits: N(r.monthly_demand_units ?? r.demand_units, 0),
  forecastUnits: N(r.forecast_units ?? r.forecast, 0),
  currentStockUnits: N(r.current_stock_units ?? r.stock_units, 0),
  daysSupply: N(r.days_supply ?? r.coverage_days ?? r.stock_coverage_days, null),
  suggestedOrder: N(r.suggested_order ?? r.order, 0),
  status: S(r.status).toLowerCase(),
  createdDate: toISO(r.created_date ?? r.created),
  _raw: r,
});

// ============================================================
// COMMUNICATIONS  (hoja: communications)
// ============================================================
export const mapCommunications = (r = {}) => {
  const preview = S(r.preview) || S(r.content).slice(0, 160);
  return {
    id: S(pick(r, ["id", "comm_id"])) || `${S(r.linked_type)}-${S(r.linked_id)}-${S(r.created_date)}`,
    createdDate: toISO(pick(r, ["created_date", "date", "created"])),
    type: S(pick(r, ["type", "channel"])).toLowerCase(), // email/phone/whatsapp/etc
    subject: S(r.subject),
    participants: S(r.participants ?? r.from_to ?? r.people),
    content: S(r.content),
    preview,
    linked_type: S(pick(r, ["linked_type", "entity_type", "link_type"])).toLowerCase(),
    linked_id: S(pick(r, ["linked_id", "entity_id", "link_id"])),
    unread: toBool(pick(r, ["unread", "is_unread"])),
    deleted: toBool(pick(r, ["deleted", "is_deleted", "archived"])),
    _raw: r,
  };
};

// Export utilidades para pruebas o usos avanzados
export const _utils = { S, N, pick, toISO, toBool };

