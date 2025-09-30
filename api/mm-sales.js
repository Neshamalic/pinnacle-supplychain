// api/mm-sales.js
// /api/mm-sales?code=PC00063&from=2025-01&to=2025-09[&debug=1]
const BASE  = (process.env.VITE_MM_BASE_PUBLIC || "https://pinnacle.managermas.cl/api").replace(/\/+$/,'');
const TOKEN = String(process.env.MANAGERMAS_TOKEN || "").replace(/\s+/g,"").trim();
const RUT   = String(process.env.VITE_MM_RUT || "77091384-5").trim();

const VENTAS_CYCLE = "V";
// Solo los tres tipos que usas:
const DOC_TYPES = [
  { code: "FAVE", sign: +1 },
  { code: "NDVE", sign: +1 },
  { code: "NCVE", sign: -1 },
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

async function fetchJsonWithTimeout(url, ms, debugArr) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  const headers = { "Accept":"application/json" };
  if (TOKEN) headers.Authorization = `Token ${TOKEN}`;
  try {
    const r = await fetch(url, { headers, signal: controller.signal });
    const text = await r.text();
    let json = null; try { json = JSON.parse(text); } catch {}
    debugArr && debugArr.push({ url, status: r.status, ok: r.ok, sample: text.slice(0,180) });
    return { ok: r.ok, status: r.status, json, text };
  } catch (e) {
    debugArr && debugArr.push({ url, error: String(e?.name || e?.message || e) });
    return { ok: false, status: 0, json: null, text: "" };
  } finally {
    clearTimeout(t);
  }
}

function sumUnits(payload, code, sign) {
  const data = Array.isArray(payload?.data) ? payload.data : [];
  let acc = 0;
  for (const doc of data) {
    const det = Array.isArray(doc?.detalle) ? doc.detalle : [];
    for (const it of det) {
      const cod = String(it?.cod_prod || it?.codigo || "").trim();
      if (cod === code) acc += sign * (Number(it?.cantidad || it?.qty || 0) || 0);
    }
  }
  return acc;
}

async function computeMonthTotal({ ym, code, debug, dbg }) {
  const { start, end } = monthStartEnd(ym);
  const df = ymd(start), dt = ymd(end);

  // Llamadas en paralelo por tipo (3 concurrentes)
  const promises = DOC_TYPES.map(({ code: t, sign }) => (async () => {
    const url = `${BASE}/documents/${encodeURIComponent(RUT)}/${encodeURIComponent(t)}/` +
                `${VENTAS_CYCLE}/?df=${df}&dt=${dt}&details=1`;
    const r = await fetchJsonWithTimeout(url, 5000, debug ? dbg.attempts : null);
    if (r.ok && r.json?.retorno) return sumUnits(r.json, code, sign);
    return 0;
  })());

  const results = await Promise.all(promises);
  const total = results.reduce((a,b)=>a+b,0);
  return [ym, total];
}

// Concurrencia limitada de meses (4 a la vez)
async function mapWithConcurrency(items, limit, mapper) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await mapper(items[idx], idx);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return out;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ ok:false, error:"Use GET" });

  const code  = String(req.query?.code || req.query?.presentation_code || "").trim();
  const debug = String(req.query?.debug || "") === "1";

  const now = new Date();
  const defTo = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const defFrom = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,"0")}`;

  const fromYM = String(req.query?.from || defFrom);
  const toYM   = String(req.query?.to   || defTo);

  if (!code)  return res.status(400).json({ ok:false, error:'Falta ?presentation_code=PC00063 (o ?code=...)' });
  if (!TOKEN) return res.status(401).json({ ok:false, error:'MANAGERMAS_TOKEN no configurado en Vercel' });

  const dbg = debug ? { base: BASE, rut: RUT, attempts: [] } : null;

  try {
    const months = yearMonthRange(fromYM, toYM);

    // Procesamos 4 meses en paralelo, cada mes con 3 fetch en paralelo
    const pairs = await mapWithConcurrency(
      months,
      4,
      async (ym) => await computeMonthTotal({ ym, code, debug, dbg })
    );

    const payload = { ok:true, presentation_code: code, from: fromYM, to: toYM, series: pairs };
    if (debug) payload._debug = dbg;
    return res.status(200).json(payload);
  } catch (e) {
    return res.status(502).json({ ok:false, error: String(e?.message || e) });
  }
};
