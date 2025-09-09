// src/lib/adapters.js

// Normaliza filas de la hoja "tenders"
export function mapTenders(r = {}) {
  const tenderId =
    String(r.tender_id ?? r.tender_number ?? '').trim();

  return {
    id: r.id ?? null,
    tenderId,
    title: String(r.title ?? '').trim(),
    status: String(r.status ?? '').toLowerCase(), // draft | submitted | in delivery | awarded | rejected ...
    deliveryDate: r.delivery_date ? new Date(r.delivery_date) : null,
    stockCoverageDays: Number(r.stock_coverage_days ?? '') || null,
    createdDate: r.created_date ? new Date(r.created_date) : null,
  };
}

// Normaliza filas de la hoja "tender_items"
export function mapTenderItems(r = {}) {
  const qty   = Number(r.awarded_qty ?? r.quantity ?? 0) || 0;
  const price = Number(r.unit_price ?? r.price ?? 0) || 0;

  return {
    tenderNumber: String(r.tender_number ?? r.tender_id ?? '').trim(),
    presentationCode: String(r.presentation_code ?? '').trim(),
    awardedQty: qty,
    unitPrice: price,
    lineTotalClp: qty * price, // usado para el Total Value
  };
}

