// src/lib/adapters.js
// Convierte nombres de columnas de Google Sheets a lo que ya usan tus componentes (camelCase)

const toBool = (v) =>
  v === true || v === 'true' || v === 1 || v === '1' || v === 'yes' || v === 'YES';

/* -------------------- PURCHASE ORDERS -------------------- */
export const mapPurchaseOrders = (rows = []) =>
  rows.map((r) => ({
    id: r.po_number,
    poNumber: r.po_number,
    tenderRef: r.tender_number,
    manufacturingStatus: r.manufacturing_status,
    qcStatus: r.qc_status,
    transportType: r.transport,
    eta: r.eta ?? r['eta '],
    costUsd: r.cost_usd ?? null,
    costClp: r.cost_clp ?? null,
    createdDate: r.order_date ?? null,
  }));

/* ------------------------ TENDERS ------------------------ */
export const mapTenders = (rows = []) =>
  rows.map((r) => ({
    id: r.tender_id,
    tenderId: r.tender_id,
    title: r.title,
    status: r.status,
    productsCount: r.products_count ?? 0,
    totalValue: r.total_value_clp ?? 0,
    currency: 'CLP',
    stockCoverage: r.stock_coverage_days ?? null,
    deliveryDate: r.delivery_date ?? null,
    createdDate: r.created_date ?? r.delivery_date ?? null,
  }));

/* ------------------------ IMPORTS ------------------------ */
export const mapImports = (rows = []) =>
  rows.map((r) => ({
    id: r.oci_number ?? r.id,
    shipmentId: r.bl_awb ?? r.shipment_id,
    arrivalDate: r.eta ?? r.arrival_date ?? null,
    departureDate: r.atd ?? r.departure_date ?? null,
    transportType: r.transport ?? r.transport_type ?? null,
    qcStatus: r.qa_status ?? r.qc_status ?? null,
    customsStatus: r.customs_status ?? r.status ?? null,
    totalCost: r.total_cost_clp ?? r.total_cost ?? 0,
    currentLocation: r.current_location ?? r.warehouse ?? null,
    originPort: r.origin_port ?? null,
    destinationPort: r.destination_port ?? null,
  }));

/* --------------------- COMMUNICATIONS -------------------- */
export const mapCommunications = (rows = []) =>
  rows.map((r) => ({
    id: r.id ?? `${r.linked_type ?? 'none'}-${r.linked_id ?? 'none'}-${r.created_date ?? 'na'}`,
    type: r.type ?? null,
    subject: r.subject ?? '',
    preview: r.preview ?? '',
    content: r.content ?? '',
    participants: r.participants ?? '',
    linked_type: r.linked_type ?? null,
    linked_id: r.linked_id ?? null,
    unread: toBool(r.unread ?? false),
    createdDate: r.created_date ?? null,
  }));

/* ------------------------- DEMAND ------------------------ */
export const mapDemand = (rows = []) =>
  rows.map((r) => ({
    monthOfSupply: r.month_of_supply ?? '',
    presentationCode: r.presentation_code ?? '',
    productName: r.product_name ?? '',
    packageSize: r.package_size ?? null,
    monthlyDemandUnits: r.monthly_demand_units ?? 0,
    currentStockUnits: r.current_stock_units ?? 0,
    daysSupply: r.days_supply ?? null,
    suggestedOrder: r.suggested_order ?? 0,
    status: r.status ?? '',
  }));
