// /api/mm-sales?code=PC00063&from=2025-01&to=2025-09[&debug=1]
const BASE = (process.env.VITE_MM_BASE_PUBLIC || "https://pinnacle.managermas.cl/api").replace(/\/+$/,'');
const TOKEN = String(process.env.MANAGERMAS_TOKEN || "").replace(/\s+/g,"").trim();

const VENTAS_CYCLE = "V";

// SOLO tus tipos (sin boleta):
const DOC_TYPES = [
  { code: "FAVE", sign: +1 }, // Factura venta electrónica
  { code: "NDVE", sign: +1 }, // Nota de débito venta electrónica
  { code: "NCVE", sign: -1 }, // Nota de crédito venta electrónica
];

function yearMonthRange(fromYM, toYM) {
  const [fy, fm] = fromYM.split("-").map(Number);
  const [ty, tm] = toYM.split("-").map(Number);
  const out = [];
  let y = fy, m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2,"0")}`);
    m += 1; if (m > 12) { m = 1; y += 1; }
  }
  return out;
}
function monthStartEnd(ym) {
  const [y, m] = ym.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2,"0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`;
  return { start, end };
}
function ymd(s) { return String(s).replaceAll("-",""); }

async function fetchJson(url) {
  const headers = { "Accept":"application/json" };
  if (TOKEN) headers.Authorization = `Token ${TOKEN}`;
  const r = await fetch(url, { headers });
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  return { ok: r.ok, status: r.status, json, text };
}

// Suma unidades del producto en el detalle de cada documento, aplicando signo
function sumUnitsFromDocuments(payload, code, sign) {
  const data = Array.isArray(payload?.data) ? payload.data : [];
  let acc = 0;
  for (const doc of data) {
    const det = Array.isArray(doc?.detalle) ? doc.detalle : [];
    for (const it of det) {
      const cod = String(it?.cod_prod || it?.codigo || "").trim();
      if (cod === code) {
        const qty = Number(it?.cantidad || it?.qty || 0) || 0;
        acc += sign * qty;
      }
    }
  }
  return acc;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ ok:false, error:"Use GET" });

  const code = String(req.query?.code || req.query?.presentation_code || "").trim();
  const rut  = String(process.env.VITE_MM_RUT || "77091384-5").trim();
  const debug = String(req.query?.debug || "") === "1";

  const now = new Date();
  const defTo = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const defFrom = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,"0")}`;

  const fromYM = String(req.query?.from || defFrom);
  const toYM   = String(req.query?.to   || defTo);

  if (!code) return res.status(400).json({ ok:false, error:'Falta ?presentation_code=PC00063 (o ?code=...)' });
  if (!TOKEN) return res.status(401).json({ ok:false, error:'MANAGERMAS_TOKEN no configurado en Vercel' });

  try {
    const months = yearMonthRange(fromYM, toYM);
    const series = [];
    const attempts = [];

    for (const ym of months) {
      const { start, end } = monthStartEnd(ym);
      const df = ymd(start), dt = ymd(end);

      let total = 0;

      for (const dtp of DOC_TYPES) {
        const url = `${BASE}/documents/${encodeURIComponent(rut)}/${encodeURIComponent(dtp.code)}/${VENTAS_CYCLE}/?df=${df}&dt=${dt}&details=1`;
        const r = await fetchJson(url);
        if (debug) attempts.push({ ym, type: dtp.code, url, status: r.status, ok: r.ok });

        if (r.ok && r.json?.retorno) {
          total += sumUnitsFromDocuments(r.json, code, dtp.sign);
        }
      }

      series.push([ym, total]);
    }

    const payload = { ok:true, presentation_code: code, from: fromYM, to: toYM, series };
    if (debug) payload._debug = { base: BASE, rut, attempts };
    return res.status(200).json(payload);

  } catch (e) {
    return res.status(502).json({ ok:false, error: String(e?.message || e) });
  }
};
