// src/lib/adapters.js
// Convierte nombres de columnas de Google Sheets a lo que ya usan tus componentes (camelCase)

// Helper simple para booleanos (por si 'unread' u otros llegan como texto/num)
const toBool = (v) => v === true || v === 'true' || v === 1 || v === '1' || v === 'yes' || v === 'YES';

/* -------------------- PURCHASE ORDERS -------------------- */
export const mapPurchaseOrders = (rows) =>
  rows.map((r) => ({
    id: r.po_number,
    poNumber: r.po_number,
    tenderRef: r.tender_number,
    manufacturingStatus: r.manufacturing_status,
    qcStatus: r.qc_status,
    transportType: r.transport,
    // fallback por si la columna quedó con espacio final en el encabezado
    eta: r.eta ?? r['eta '],
    costUsd: r.cost_usd ?? null,
    costClp: r.cost_clp ?? null,
    // la UI ordena por createdDate; usamos order_date de tu Sheet
    createdDate: r.order_date ?? null,
  }));

/* ------------------------ TENDERS ------------------------ */
export const mapTenders = (rows) =>
  rows.map((r) => ({
    id: r.tender_id,
    tenderId: r.tender_id,
    title: r.title,
    status: r.status,
    productsCount: r.products_count ?? 0,
    totalValue: r.total_value_clp ?? 0, // CLP
    currency: 'CLP',
    stockCoverage: r.stock_coverage_days ?? null,
    deliveryDate: r.delivery_date ?? null,
    createdDate: r.created_date ?? r.delivery_date ?? null,
    // Si en el futuro agregas más campos (tags, description), puedes mapearlos aquí
  }));

/* ------------------------ IMPORTS ------------------------ */
/* Este mapea lo que usa Import Management (status cards, filtros y tabla) */
export const mapImports = (rows) =>
  rows.map((r) => ({
    id: r.oci_number ?? r.id,                     // identificador de importación
    shipmentId: r.bl_awb ?? r.shipment_id,        // BL / AWB
    arrivalDate: r.eta ?? r.arrival_date ?? null, // fecha de arribo
    departureDate: r.atd ?? r.departure_date ?? null, // fecha de salida
    transportType: r.transport ?? r.transport_type ?? null, // sea/air
    qcStatus: r.qa_status ?? r.qc_status ?? null, // approved / pending / in-progress
    customsStatus: r.customs_status ?? r.status ?? null, // cleared / in-clearance / pending
    totalCost: r.total_cost_clp ?? r.total_cost ?? 0, // valor total en CLP si existe
    currentLocation: r.current_location ?? r.warehouse ?? null,
    originPort: r.origin_port ?? null,
    destinationPort: r.destination_port ?? null,
    // Campos opcionales a futuro:
    // warehouseStatus: r.warehouse_status ?? null,
    // inventoryStatus: r.inventory_status ?? null,
  }));

/* --------------------- COMMUNICATIONS -------------------- */
/* Útil para la vista de Communications Log */
export const mapCommunications = (rows) =>
  rows.map((r) => ({
    // si no hay id, generamos uno estable con tipo+id+fecha
    id: r.id ?? `${r.linked_type ?? 'none'}-${r.linked_id ?? 'none'}-${r.created_date ?? 'na'}`,
    type: r.type ?? null,
    subject: r.subject ?? '',
    preview: r.preview ?? '',
    content: r.content ?? '',
    participants: r.participants ?? '', // si viene "a,b,c" la UI lo puede mostrar tal cual
    linked_type: r.linked_type ?? null,
    linked_id: r.linked_id ?? null,
    unread: toBool(r.unread ?? false),
    createdDate: r.created_date ?? null,
  }));

/* ------------------------- DEMAND ------------------------ */
/* Útil para Demand Forecasting */
export const mapDemand = (rows) =>
  rows.map((r) => ({
    monthOfSupply: r.month_of_supply ?? '',        // ej: 2025-09
    presentationCode: r.presentation_code ?? '',
    productName: r.product_name ?? '',
    packageSize: r.package_size ?? null,           // ej: 100 / 30 / 20
    monthlyDemandUnits: r.monthly_demand_units ?? 0,
    currentStockUnits: r.current_stock_units ?? 0,
    daysSupply: r.days_supply ?? null,
    suggestedOrder: r.suggested_order ?? 0,
    status: r.status ?? '',                        // ej: ok / critical / low
  }));
