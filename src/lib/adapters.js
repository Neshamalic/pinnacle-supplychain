// src/lib/adapters.js
const s = (v) => (v ?? "").toString().trim();
const n = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

export function mapPurchaseOrders(r) {
  return {
    id: r.id ?? r.po_number ?? r.poNumber ?? "",
    poNumber: s(r.po_number ?? r.poNumber),
    tenderRef: s(r.tender_ref ?? r.tenderRef),
    manufacturingStatus: s(r.manufacturing_status ?? r.manufacturingStatus).toLowerCase(),
    qcStatus: s(r.qc_status ?? r.qcStatus).toLowerCase(),
    transportType: s(r.transport_type ?? r.transportType).toLowerCase(),
    eta: r.eta ?? r.delivery_date ?? "",
    costUsd: n(r.cost_usd ?? r.costUsd),
    costClp: n(r.cost_clp ?? r.costClp),
    createdDate: r.created_date ?? r.created ?? ""
  };
}

export function mapCommunications(r) {
  return {
    id: r.id ?? `${s(r.type)}-${s(r.subject)}-${s(r.created_date ?? r.date ?? "")}`,
    linked_type: s(r.linked_type),
    linked_id: s(r.linked_id),
    type: s(r.type).toLowerCase(),
    subject: s(r.subject),
    content: s(r.content),
    preview: s(r.preview),
    participants: s(r.participants),
    createdDate: r.created_date ?? r.created ?? r.date ?? ""
  };
}
