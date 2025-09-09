// src/lib/adapters.js

/* Helpers seguros */
const S = (v) => (v ?? "").toString().trim();
const N = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const toArray = (x) => (Array.isArray(x) ? x : x == null ? [] : [x]);

/* -------------------- PURCHASE ORDERS -------------------- */
export function mapPurchaseOrders(r) {
  return {
    id: r.id ?? r.po_number ?? r.poNumber ?? "",
    poNumber: S(r.po_number ?? r.poNumber),
    tenderRef: S(r.tender_ref ?? r.tenderRef),
    manufacturingStatus: S(r.manufacturing_status ?? r.manufacturingStatus).toLowerCase(),
    qcStatus: S(r.qc_status ?? r.qcStatus).toLowerCase(),
    transportType: S(r.transport_type ?? r.transportType).toLowerCase(),
    eta: r.eta ?? r.delivery_date ?? "",
    costUsd: N(r.cost_usd ?? r.costUsd),
    costClp: N(r.cost_clp ?? r.costClp),
    createdDate: r.created_date ?? r.created ?? "",
  };
}

/* Items de órdenes de compra (por si alguna vista los usa) */
export function mapPurchaseOrderItems(r) {
  return {
    id: r.id ?? `${S(r.po_number ?? r.poNumber)}-${S(r.presentation_code ?? r.presentationCode)}`,
    poNumber: S(r.po_number ?? r.poNumber),
    presentationCode: S(r.presentation_code ?? r.presentationCode),
    quantity: N(r.quantity ?? r.qty ?? r.units),
    unitPriceUsd: N(r.unit_price_usd ?? r.unitPriceUsd),
    totalUsd: N(r.total_usd ?? r.totalUsd),
  };
}

/* ------------------------- TENDERS ----------------------- */
export function mapTenders(r) {
  return {
    id: r.tender_id ?? r.tender_number ?? S(r.id ?? r.tender ?? ""),
    title: S(r.title),
    status: S(r.status).toLowerCase(),
    deliveryDate: r.delivery_date ?? r.deliveryDate ?? "",
    products_count: N(r.products_count ?? r.productsCount),
    stock_coverage_days: N(r.stock_coverage_days ?? r.stockCoverageDays),
    total_value_clp: N(r.total_value_clp ?? r.totalValueClp),
    created_date: r.created_date ?? r.created ?? "",
  };
}

/* --------------------- COMMUNICATIONS -------------------- */
export function mapCommunications(r) {
  return {
    id:
      r.id ??
      `${S(r.type)}-${S(r.subject)}-${S(r.created_date ?? r.date ?? "")}`,
    linked_type: S(r.linked_type),
    linked_id: S(r.linked_id),
    type: S(r.type).toLowerCase(),
    subject: S(r.subject),
    content: S(r.content),
    preview: S(r.preview),
    participants: S(r.participants ?? toArray(r.participants).join(", ")),
    createdDate: r.created_date ?? r.created ?? r.date ?? "",
  };
}

/* ------------------------- IMPORTS ----------------------- */
export function mapImports(r) {
  return {
    id: r.id ?? S(r.oci_number ?? r.oci ?? ""),
    ociNumber: S(r.oci_number ?? r.oci),
    transportType: S(r.transport_type ?? r.transportType).toLowerCase(),
    eta: r.eta ?? "",
    status: S(r.status).toLowerCase(),
    createdDate: r.created_date ?? r.created ?? "",
  };
}

export function mapImportItems(r) {
  return {
    id:
      r.id ??
      `${S(r.oci_number ?? r.oci)}-${S(r.presentation_code ?? r.presentationCode)}`,
    ociNumber: S(r.oci_number ?? r.oci),
    presentationCode: S(r.presentation_code ?? r.presentationCode),
    lotNumber: S(r.lot_number ?? r.lotNumber),
    quantity: N(r.quantity ?? r.qty ?? r.units),
  };
}

/* ------------------------- DEMAND ------------------------ */
/* En tu Apps Script vimos la clave: demand: ['month_of_supply','presentation_code']
   Este adapter mapea lo mínimo para tu tabla de planificación y tolera columnas extra. */
export function mapDemand(r) {
  const month = S(r.month_of_supply ?? r.month ?? r.period ?? "");
  const pres = S(r.presentation_code ?? r.presentationCode);

  return {
    id: r.id ?? `${pres}-${month}`,
    monthOfSupply: month,
    presentationCode: pres,

    // Campos opcionales (si existen en la hoja se usarán; si no, quedan “seguros”)
    product: S(r.product ?? r.product_name ?? r.name),
    demandUnits: N(r.demand_units ?? r.demand ?? r.required_units),
    forecastUnits: N(r.forecast_units ?? r.forecast),
    actualUnits: N(r.actual_units ?? r.actual),
    stockUnits: N(r.stock_units ?? r.stock),
    coverageDays: N(r.coverage_days ?? r.stock_coverage_days),

    createdDate: r.created_date ?? r.created ?? "",
  };
}

/* ----------------- (agrega más si los usas) --------------- */
// export function mapProducts(r) { ... }
