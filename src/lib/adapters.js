// src/lib/adapters.js

/** ===================== Utils ===================== */
const str = (v) => (v == null ? "" : String(v).trim());

const toNumber = (v) => {
  if (v == null || v === "") return 0;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  // Soporta "$ 1.234,56", "CLP 1,234.56", etc.
  const cleaned = String(v).replace(/[^0-9.,-]/g, ""); // deja solo dígitos, separadores y signo
  const s = cleaned.replace(/\./g, "").replace(/,/g, ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

const toDateISO = (v) => {
  if (!v) return "";
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
};

/** pick(row, ["colA","colB"]) -> primer valor existente */
const pick = (row, keys) => {
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(row, k)) return row[k];
  }
  return undefined;
};

/** ===================== TENDERS ===================== */
export const mapTenders = (row = {}) => {
  const tenderId = str(pick(row, ["tender_id", "tender_number", "id", "tender"]));
  return {
    id: tenderId || str(row.id || ""),
    tenderId,
    title: str(pick(row, ["title", "tender_title", "name"]) || ""),
    description: str(pick(row, ["description", "notes", "detail"]) || ""), // ← añadido
    status: str(pick(row, ["status", "tender_status"]) || "").toLowerCase(),
    buyer: str(pick(row, ["buyer", "organization", "org", "customer"]) || ""),
    deliveryDate: toDateISO(pick(row, ["delivery_date", "delivery", "eta", "due_date"])),
    // Métricas opcionales (si no vienen, se calculan en el front con tender_items)
    productsCount: toNumber(pick(row, ["products_count", "items_count", "n_items"])),
    totalValue: toNumber(pick(row, ["total_value", "total_usd"])),
    stockCoverage: toNumber(pick(row, ["stock_coverage", "coverage"])),
    _raw: row,
  };
};

/** ================ TENDER ITEMS ===================== */
/* Columnas típicas: tender_number|tender_id, presentation_code|product_code,
   awarded_qty, unit_price, currency, (opt) stock_coverage_days */
export const mapTenderItems = (row = {}) => {
  const tenderId = str(pick(row, ["tender_number", "tender_id", "tender"]));
  const qty = toNumber(pick(row, ["awarded_qty", "awarded_quantity", "qty", "quantity"]));
  const price = toNumber(pick(row, ["unit_price", "price"]));
  const currency = str(pick(row, ["currency", "curr"]) || "USD").toUpperCase();

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
    presentationCode: str(
      pick(row, ["presentation_code", "product_code", "sku", "code"]) || "" // ← añadido product_code
    ),
    awardedQty: qty,
    unitPrice: price,
    currency,
    stockCoverageDays,
    lineTotal: qty * price,
    _raw: row,
  };
};

/** ===== PRODUCT PRESENTATION MASTER (enrichment) ===== */
export const mapPresentationMaster = (row = {}) => {
  return {
    presentationCode: str(
      pick(row, ["presentation_code", "presentationCode", "presentation", "sku", "code"]) || ""
    ),
    productName: str(pick(row, ["product_name", "productName", "name"]) || ""),
    packageUnits:
      toNumber(pick(row, ["package_units", "packageUnits", "units_per_package", "units"])) || 1,
    _raw: row,
  };
};

/** ================ PURCHASE ORDERS ================== */
export const mapPurchaseOrders = (row = {}) => {
  const poNumber = str(pick(row, ["po_number", "po", "id", "poNumber"]));
  return {
    id: str(pick(row, ["id", "po_id"]) || poNumber),
    poNumber,
    tenderRef: str(pick(row, ["tender_ref", "tender_id", "tender_number", "tenderRef"]) || ""),
    manufacturingStatus: str(
      pick(row, ["manufacturing_status", "mfg_status", "manufacturing"]) || ""
    ).toLowerCase(),
    qcStatus: str(pick(row, ["qc_status", "quality_status", "qc"]) || "").toLowerCase(),
    transportType: str(pick(row, ["transport_type", "transport", "shipping"]) || "").toLowerCase(),
    eta: toDateISO(pick(row, ["eta", "arrival_date", "delivery_date"])),
    costUsd: toNumber(pick(row, ["cost_usd", "usd", "amount_usd"])),
    costClp: toNumber(pick(row, ["cost_clp", "clp", "amount_clp"])),
    createdDate: toDateISO(pick(row, ["created_date", "created", "date_created"])),
    _raw: row,
  };
};

/** ============ PURCHASE ORDER ITEMS (líneas) ========== */
/* Acepta ordered_qty | qty para la cantidad pedida.
   Permite estado por línea (manufacturing_status) opcional. */
export const mapPurchaseOrderItems = (row = {}) => {
  const ordered = toNumber(pick(row, ["ordered_qty", "qty", "quantity"]));
  const price = toNumber(pick(row, ["unit_price", "price"]));
  return {
    poNumber: str(pick(row, ["po_number", "po", "poNumber"]) || ""),
    presentationCode: str(
      pick(row, ["presentation_code", "product_code", "sku", "code"]) || "" // ← añadido product_code
    ),
    qty: ordered,
    unitPrice: price,
    itemManufacturingStatus: str(
      pick(row, ["manufacturing_status", "mfg_status", "status"]) || ""
    ).toLowerCase(),
    lineTotal: ordered * price,
    _raw: row,
  };
};

/** ===================== IMPORTS ====================== */
/* import_status reemplaza a customs_status. Normalizamos:
   - "in customs" -> "transit"
   - "cleared"    -> "warehouse" */
export const mapImports = (row = {}) => {
  const shipmentId = str(pick(row, ["shipment_id", "shipment", "shipmentId", "id"]) || "");
  const oci = str(pick(row, ["oci_number", "oci"]) || "");
  const po = str(pick(row, ["po_number", "po"]) || "");

  let importStatus = str(pick(row, ["import_status", "customs_status"]) || "").toLowerCase();
  if (importStatus === "in customs") importStatus = "transit";
  if (importStatus === "cleared") importStatus = "warehouse";

  return {
    id: shipmentId || oci || po || str(row.id || ""),
    shipmentId,
    ociNumber: oci,
    poNumber: po,
    transportType: str(pick(row, ["transport_type", "transport", "mode"]) || "").toLowerCase(),
    eta: toDateISO(pick(row, ["eta", "arrival_date", "arrival"])),
    importStatus, // 'transit' | 'warehouse'
    // Costo CIF en USD (alias)
    totalCostUsd: toNumber(pick(row, ["cif_cost_usd", "total_cost_usd", "cost_usd"])),
    _raw: row,
  };
};

/** ================== IMPORT ITEMS ==================== */
/* Normaliza y también guarda alias para máxima compatibilidad:
   - ociNumber + (oci)
   - poNumber  + (po)
   - shipmentId + (shipment_id)
*/
export const mapImportItems = (row = {}) => {
  const normalized = {
    shipmentId: str(pick(row, ["shipmentId", "shipment_id", "shipment", "ShipmentId"]) || ""),
    ociNumber: str(pick(row, ["ociNumber", "oci_number", "oci", "OCI", "oci_id"]) || ""),
    poNumber: str(pick(row, ["poNumber", "po_number", "po", "PO", "po_id"]) || ""),
    presentationCode: str(
      pick(row, ["presentationCode", "presentation_code", "product_code", "sku", "code"]) || ""
    ),
    lotNumber: str(pick(row, ["lotNumber", "lot_number", "lot"]) || ""),
    qty: toNumber(pick(row, ["qty", "quantity"])),
    unitPrice: toNumber(pick(row, ["unitPrice", "unit_price", "price"])),
    currency: str(pick(row, ["currency", "curr"]) || "USD").toUpperCase(),
    qcStatus: str(pick(row, ["qcStatus", "qc_status", "quality_status", "qc"]) || "").toLowerCase(),
  };

  // alias (para componentes más viejos que esperen estos nombres)
  return {
    ...normalized,
    oci: normalized.ociNumber,
    po: normalized.poNumber,
    shipment_id: normalized.shipmentId,
    product_code: normalized.presentationCode,
    _raw: row,
  };
};

/** ====================== DEMAND ====================== */
export const mapDemand = (row = {}) => {
  return {
    monthOfSupply: str(pick(row, ["month_of_supply", "month"]) || ""),
    presentationCode: str(pick(row, ["presentation_code", "sku", "code"]) || ""),
    forecastUnits: toNumber(pick(row, ["forecast_units", "forecast", "units"])),
    historicalUnits: toNumber(pick(row, ["historical_units", "history_units", "hist_units"])),
    _raw: row,
  };
};

/** ================== COMMUNICATIONS ================= */
export const mapCommunications = (row = {}) => {
  return {
    id: str(pick(row, ["id", "comm_id"]) || ""),
    createdDate: toDateISO(pick(row, ["created_date", "date", "created"])),
    type: str(pick(row, ["type", "channel"]) || "").toLowerCase(), // email/phone/whatsapp/etc
    subject: str(pick(row, ["subject", "title"]) || ""),
    participants: str(pick(row, ["participants", "from_to", "people"]) || ""),
    content: str(pick(row, ["content", "body", "text"]) || ""),
    preview: str(pick(row, ["preview", "snippet"]) || ""),
    linked_type: str(pick(row, ["linked_type", "entity_type", "link_type"]) || "").toLowerCase(),
    linked_id: str(pick(row, ["linked_id", "entity_id", "link_id"]) || ""),
    _raw: row,
  };
};

/** ================ Export utils ====================== */
export const _utils = { str, toNumber, toDateISO, pick };

