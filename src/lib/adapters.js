// src/lib/adapters.js
const S = (v) => (v ?? "").toString().trim();
const N = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const toArray = (x) => (Array.isArray(x) ? x : x == null ? [] : [x]);

/* -------- Purchase Orders -------- */
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

/* -------- Tenders (si los usas) -------- */
export function mapTenders(r) {
  return {
    id: r.tender_id ?? r.tender_number ?? "",
    title: S(r.title),
    status: S(r.status).toLowerCase(),
    deliveryDate: r.delivery_date ?? r.deliveryDate ?? "",
    products_count: N(r.products_count ?? r.productsCount),
    stock_coverage_days: N(r.stock_coverage_days ?? r.stockCoverageDays),
    total_value_clp: N(r.total_value_clp ?? r.totalValueClp),
    created_date: r.created_date ?? r.created ?? "",
  };
}

/* -------- Communications -------- */
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

/* -------- Añade aquí otros adapters con el mismo patrón -------- */
// export function mapImports(r) { ... }
// export function mapImportItems(r) { ... }
// export function mapDemand(r) { ... }
