// src/lib/adapters.js

/** Utils -------------------------------------------------- */
const str = (v) => (v == null ? "" : String(v).trim());
const toNumber = (v) => {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/\./g, "").replace(/,/g, ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};
const toDateISO = (v) => {
  if (!v) return "";
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
};
const pick = (row, keys) => {
  for (const k of keys) if (Object.prototype.hasOwnProperty.call(row, k)) return row[k];
  return undefined;
};

/* -------------------------- Tenders -------------------------- */
export const mapTenders = (row = {}) => {
  const tenderId = str(pick(row, ["tender_id", "tender_number", "id", "tender"]));
  return {
    id: tenderId || str(row.id || ""),
    tenderId,
    title: str(pick(row, ["title", "tender_title", "name", "description"]) || ""),
    status: str(pick(row, ["status", "tender_status"]) || "").toLowerCase(),
    buyer: str(pick(row, ["buyer", "organization", "org", "customer"]) || ""),
    deliveryDate: toDateISO(pick(row, ["delivery_date", "delivery", "eta", "due_date"])),
    productsCount: toNumber(pick(row, ["products_count", "items_count", "n_items"])),
    totalValue: toNumber(pick(row, ["total_value", "total_usd"])),
    stockCoverage: toNumber(pick(row, ["stock_coverage", "coverage"])),
    _raw: row,
  };
};

export const mapTenderItems = (row = {}) => {
  const tenderId = str(pick(row, ["tender_number", "tender_id", "tender"]));
  const qty = toNumber(pick(row, ["awarded_qty", "awarded_quantity", "qty", "quantity"]));
  const price = toNumber(pick(row, ["unit_price", "price"]));
  const currency = str(pick(row, ["currency", "curr"]) || "USD");
  const sc = pick(row, [
    "stock_coverage_days",
    "stock_coverage",
    "coverage_days",
    "days_coverage",
    "coverage",
  ]);
  const stockCoverageDays = sc === undefined ? undefined : toNumber(sc);

  return {
    tenderId,
    presentationCode: str(pick(row, ["presentation_code", "sku", "code"]) || ""),
    awardedQty: qty,
    unitPrice: price,
    currency,
    stockCoverageDays,
    lineTotal: qty * price,
    _raw: row,
  };
};

/* ---- Presentation master (para package_units en otros cálculos) ---- */
export const mapPresentationMaster = (row = {}) => ({
  presentationCode: str(
    pick(row, ["presentation_code", "presentationCode", "presentation", "sku", "code"]) || ""
  ),
  productName: str(pick(row, ["product_name", "productName", "name"]) || ""),
  packageUnits: toNumber(pick(row, ["package_units", "packageUnits", "units_per_package", "units"])) || 1,
  _raw: row,
});

/* -------------------- Purchase Orders -------------------- */
export const mapPurchaseOrders = (row = {}) => {
  const poNumber = str(pick(row, ["po_number", "po", "id", "poNumber"]));
  return {
    id: str(pick(row, ["id", "po_id"]) || poNumber),
    poNumber,
    tenderRef: str(pick(row, ["tender_ref", "tender_id", "tender_number", "tenderRef"]) || ""),
    manufacturingStatus: str(pick(row, ["manufacturing_status", "mfg_status", "manufacturing"]) || "")
      .toLowerCase(),
    qcStatus: str(pick(row, ["qc_status", "quality_status", "qc"]) || "").toLowerCase(),
    transportType: str(pick(row, ["transport_type", "transport", "shipping"]) || "").toLowerCase(),
    eta: toDateISO(pick(row, ["eta", "arrival_date", "delivery_date"])),
    costUsd: toNumber(pick(row, ["cost_usd", "usd", "amount_usd"])),
    costClp: toNumber(pick(row, ["cost_clp", "clp", "amount_clp"])),
    createdDate: toDateISO(pick(row, ["created_date", "created", "date_created"])),
    _raw: row,
  };
};

export const mapPurchaseOrderItems = (row = {}) => {
  const qty = toNumber(pick(row, ["qty", "quantity"]));
  const price = toNumber(pick(row, ["unit_price", "price"]));
  return {
    poNumber: str(pick(row, ["po_number", "po", "poNumber"])),
    presentationCode: str(pick(row, ["presentation_code", "sku", "code"]) || ""),
    qty,
    unitPrice: price,
    lineTotal: qty * price,
    _raw: row,
  };
};

/* -------------------- Imports (nuevo modelo) -------------------- */
// normaliza import_status a "transit" | "warehouse"
const normImportStatus = (v) => {
  const s = str(v).toLowerCase();
  if (["warehouse", "in_warehouse", "stored", "cleared"].includes(s)) return "warehouse";
  if (["transit", "in_transit", "in customs", "in_customs", "customs"].includes(s)) return "transit";
  return s || "transit";
};

export const mapImports = (row = {}) => {
  const shipmentId = str(pick(row, ["shipment_id", "id"]));
  return {
    id: shipmentId || str(row.id || ""),
    shipmentId,
    // fechas
    arrivalDate: toDateISO(pick(row, ["arrival_date", "eta", "arrival"])),
    eta: toDateISO(pick(row, ["arrival_date", "eta", "arrival"])), // alias por compatibilidad
    // transporte / estados
    transportType: str(pick(row, ["transport_type", "transport", "mode"]) || "").toLowerCase(),
    importStatus: normImportStatus(pick(row, ["import_status", "customs_status", "customs", "status"])),
    // totales (si no vienen, la vista los puede recomputar con import_items)
    totalCostClp: toNumber(pick(row, ["total_cost_clp", "cost_clp", "amount_clp"])),
    totalCostUsd: toNumber(pick(row, ["total_cost_usd", "cost_usd", "amount_usd"])),
    _raw: row,
  };
};

/* items por shipment/oci/po/product/lot con QC por lote */
export const mapImportItems = (row = {}) => ({
  shipmentId: str(pick(row, ["shipment_id", "shipment"])),
  ociNumber: str(pick(row, ["oci_number", "oci"]) || ""),
  poNumber: str(pick(row, ["po_number", "po"]) || ""),
  productCode: str(pick(row, ["product_code", "presentation_code", "sku", "code"]) || ""),
  lotNumber: str(pick(row, ["lot_number", "lot"]) || ""),
  qty: toNumber(pick(row, ["qty", "quantity", "units"])),
  unitPrice: toNumber(pick(row, ["unit_price", "price"])),
  currency: str(pick(row, ["currency", "curr"]) || "CLP").toUpperCase(),
  qcStatus: str(pick(row, ["qc_status", "quality_status", "qc"]) || "").toLowerCase(),
  _raw: row,
});

/* ---------------------- Demand ---------------------- */
export const mapDemand = (row = {}) => ({
  monthOfSupply: str(pick(row, ["month_of_supply", "month"]) || ""),
  presentationCode: str(pick(row, ["presentation_code", "sku", "code"]) || ""),
  forecastUnits: toNumber(pick(row, ["forecast_units", "forecast", "units"])),
  historicalUnits: toNumber(pick(row, ["historical_units", "history_units", "hist_units"])),
  _raw: row,
});

/* ---------------------- Communications ---------------------- */
export const mapCommunications = (row = {}) => ({
  id: str(pick(row, ["id", "comm_id"]) || ""),
  createdDate: toDateISO(pick(row, ["created_date", "date", "created"])),
  type: str(pick(row, ["type", "channel"]) || "").toLowerCase(),
  subject: str(pick(row, ["subject", "title"]) || ""),
  participants: str(pick(row, ["participants", "from_to", "people"]) || ""),
  content: str(pick(row, ["content", "body", "text"]) || ""),
  preview: str(pick(row, ["preview", "snippet"]) || ""),
  linked_type: str(pick(row, ["linked_type", "entity_type", "link_type"]) || "").toLowerCase(),
  linked_id: str(pick(row, ["linked_id", "entity_id", "link_id"]) || ""),
  _raw: row,
});

/** Export utils */
export const _utils = { str, toNumber, toDateISO, pick };

