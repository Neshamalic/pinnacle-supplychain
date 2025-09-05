// src/lib/adapters.js
// Convierte nombres de columnas de Google Sheets a lo que ya usan tus componentes (camelCase)

// Helpers
const toBool = (v) =>
  v === true || v === 'true' || v === 1 || v === '1' || v === 'yes' || v === 'YES';

const toStr = (v) => (v === undefined || v === null ? '' : String(v).trim());

// Convierte a número; si trae símbolos (ej. "$ 1.234,56") intenta limpiar.
// Por defecto: def = 0 (o pásale null si quieres null cuando no haya valor)
const toNum = (v, def = 0) => {
  if (v === undefined || v === null || v === '') return def;
  // Normaliza separadores: quita espacios y símbolos no numéricos (mantiene . - ,)
  let s = String(v).trim();
  // Si el formato parece “1.234,56” (coma decimal), conviértelo a “1234.56”
  if (/,/.test(s) && /\.\d{3}/.test(s)) {
    // caso con miles “.” y coma decimal
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    // quita miles con coma, deja punto decimal
    s = s.replace(/,/g, '');
  }
  // quita cualquier símbolo no numérico (excepto . y -)
  s = s.replace(/[^0-9.-]/g, '');
  const n = Number(s);
  return Number.isNaN(n) ? def : n;
};

/* -------------------- PURCHASE ORDERS -------------------- */
export const mapPurchaseOrders = (rows) =>
  rows.map((r) => ({
    id: toStr(r.po_number) || toStr(r.id),
    poNumber: toStr(r.po_number),
    tenderRef: toStr(r.tender_number),
    manufacturingStatus: toStr(r.manufacturing_status),
    qcStatus: toStr(r.qc_status),
    transportType: toStr(r.transport), // 'sea' | 'air' | ...
    // fallback por si la columna quedó con espacio final en el encabezado
    eta: toStr(r.eta ?? r['eta ']) || null,
    costUsd: toNum(r.cost_usd, null),
    costClp: toNum(r.cost_clp, null),
    // la UI ordena por createdDate; usamos order_date de tu Sheet
    createdDate: toStr(r.order_date) || null,
  }));

/* ------------------------ TENDERS ------------------------ */
export const mapTenders = (rows) =>
  rows.map((r) => ({
    id: toStr(r.tender_id),
    tenderId: toStr(r.tender_id),
    title: toStr(r.title),
    status: toStr(r.status),
    productsCount: toNum(r.products_count, 0),
    totalValue: toNum(r.total_value_clp, 0), // CLP
    currency: 'CLP',
    stockCoverage: toNum(r.stock_coverage_days, null),
    deliveryDate: toStr(r.delivery_date) || null,
    createdDate: toStr(r.created_date) || toStr(r.delivery_date) || null,
    // Si en el futuro agregas más campos (tags, description), puedes mapearlos aquí
  }));

/* ------------------------ IMPORTS ------------------------ */
/* Este mapea lo que usa Import Management (status cards, filtros y tabla) */
export const mapImports = (rows) =>
  rows.map((r) => ({
    id: toStr(r.oci_number) || toStr(r.id),           // identificador de importación
    shipmentId: toStr(r.bl_awb) || toStr(r.shipment_id), // BL / AWB
    arrivalDate: toStr(r.eta) || toStr(r.arrival_date) || null,
    departureDate: toStr(r.atd) || toStr(r.departure_date) || null,
    transportType: toStr(r.transport) || toStr(r.transport_type) || null, // 'sea'/'air'
    qcStatus: toStr(r.qa_status) || toStr(r.qc_status) || null,           // approved / pending / in-progress
    customsStatus: toStr(r.customs_status) || toStr(r.status) || null,    // cleared / in-clearance / pending
    totalCost: toNum(r.total_cost_clp ?? r.total_cost, 0),                // CLP si existe
    currentLocation: toStr(r.current_location) || toStr(r.warehouse) || null,
    originPort: toStr(r.origin_port) || null,
    destinationPort: toStr(r.destination_port) || null,
    // Campos opcionales a futuro:
    // warehouseStatus: toStr(r.warehouse_status) || null,
    // inventoryStatus: toStr(r.inventory_status) || null,
  }));

/* --------------------- COMMUNICATIONS -------------------- */
/* Útil para la vista de Communications Log */
export const mapCommunications = (rows) =>
  rows.map((r) => ({
    // si no hay id, generamos uno estable con tipo+id+fecha
    id: toStr(r.id) || `${toStr(r.linked_type) || 'none'}-${toStr(r.linked_id) || 'none'}-${toStr(r.created_date) || 'na'}`,
    type: toStr(r.type) || null,           // email / phone / whatsapp...
    subject: toStr(r.subject),
    preview: toStr(r.preview),
    content: toStr(r.content),
    participants: toStr(r.participants),   // si viene "a,b,c" la UI lo muestra tal cual
    linked_type: toStr(r.linked_type) || null,
    linked_id: toStr(r.linked_id) || null,
    unread: toBool(r.unread ?? false),
    createdDate: toStr(r.created_date) || null,
  }));

/* ------------------------- DEMAND ------------------------ */
/* Útil para Demand Forecasting */
export const mapDemand = (rows) =>
  rows.map((r) => ({
    monthOfSupply: toStr(r.month_of_supply),        // ej: 2025-09
    presentationCode: toStr(r.presentation_code),
    productName: toStr(r.product_name),
    packageSize: toNum(r.package_size, null),       // ej: 100 / 30 / 20
    monthlyDemandUnits: toNum(r.monthly_demand_units, 0),
    currentStockUnits: toNum(r.current_stock_units, 0),
    daysSupply: toNum(r.days_supply, null),
    suggestedOrder: toNum(r.suggested_order, 0),
    status: toStr(r.status),                        // ej: ok / critical / low
  }));
