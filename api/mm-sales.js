// api/mm-sales.js
// /api/mm-sales?code=PC00063&from=2025-01&to=2025-09[&debug=1]
const BASE  = (process.env.VITE_MM_BASE_PUBLIC || "https://pinnacle.managermas.cl/api").replace(/\/+$/,'');
const TOKEN = String(process.env.MANAGERMAS_TOKEN || "").replace(/\s+/g,"").trim();
const RUT   = String(process.env.VITE_MM_RUT || "77091384-5").trim();

const VENTAS_CYCLE = "V";
// Solo los tipos que usas:
const DOC_TYPES = [
  { code: "FAVE", sign: +1 },
  { code: "NDVE", sign: +1 },
  { code: "NCVE", sign: -1 },
];

// Config de rendimiento/robustez
const REQUEST_TIMEOUT_MS = 12000; // 12s para endpoints lentos
const MONTH_CONCURRENCY  = 4;     // 4 meses a la vez
const RETRIES            = 1;     // reintentar 1 vez si aborta o 5xx

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

async function fetchJsonWithTimeout(url, ms, debugArr, attemptLabel) {
  const headers = { "Accept":"application/json" };
  if (TOKEN) headers.Authorization = `Token ${TOKEN}`;

  let last;
  for (let k = 0; k <= RETRIES; k++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), ms);
    try {
      const r = await fetch(url, { headers, signal: controller.signal });
      const text = await r.text();
      let json = null; try { json = JSON.parse(text); } catch {}
      last = { ok: r.ok, status: r.status, json, text, aborted: false };
      if (debugArr) debugArr.push({ url, status: r.status, ok: r.ok, sample: text.slice(0,180), attempt: k, label: attemptLabel });
      if (r.ok) return last; // éxito, salimos
      // Si es 5xx, reintenta una vez
      if (r.status >= 500 && k < RETRIES) continue;
      return last;
    } catch (e) {
      last = { ok: false, status: 0, json: null, text: "", aborted: (e?.name === "AbortError") };
      if (debugArr) debugArr.push({ url, error: String(e?.name || e?.message || e), attempt: k, label: attemptLabel });
      if (k < RETRIES) continue; // reintento
      return last;
    } finally {
      clearTimeout(t);
    }
  }
  return last;
}

function firstExisting(obj, keys, fallback) {
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
  }
  return fallback;
}

// Extrae un array de líneas de detalle, tolerando distintos nombres
function extractDetailLines(doc) {
  const candidates = [
    "detalle", "detalles", "items", "lineas", "line_items", "detail", "detail_lines"
  ];
  for (const key of candidates) {
    const v = doc?.[key];
    if (Array.isArray(v)) return v;
  }
  return [];
}

// Obtiene el código y la cantidad con múltiples alias
function readLineCode(line) {
  const code = firstExisting(line, [
    "cod_prod", "codigo", "producto_codigo", "coditem", "codigo_item",
    "product_code", "sku", "codigo_prod"
  ], "");
  return String(code || "").trim();
}
function readLineQty(line) {
  const qty = firstExisting(line, ["cantidad","qty","unidades","units"], 0);
  const n = Number(qty);
  return Number.isFinite(n) ? n : 0;
}

// Suma unidades del producto en el detalle de cada documento, aplicando signo
function sumUnits(payload, code, sign, debugSink) {
  const data = Array.isArray(payload?.data) ? payload.data : [];
  let acc = 0, matched = 0;
  for (const doc of data) {
    const lines = extractDetailLines(doc);
    for (const ln of lines) {
      const cod = readLineCode(ln);
      if (cod === code) {
        const qty = readLineQty(ln);
        acc += sign * qty;
        matched += qty;
      }
    }
  }
  if (debugSink) debugSink.matchedUnits = matched;
  return acc;
}

async function computeMonthTotal({ ym, code, debug, dbg }) {
  const { start, end } = monthStartEnd(ym);
  const df = ymd(start), dt = ymd(end);

  // 3 fetch en paralelo (FAVE/NDVE/NCVE)
  const promises = DOC_TYPES.map(({ code: t, sign }) => (async () => {
    const url = `${BASE}/documents/${encodeURIComponent(RUT)}/${encodeURIComponent(t)}/${VENTAS_CYCLE}/?df=${df}&dt=${dt}&details=1`;
    const dbgItem = debug ? { ym, type: t } : null;
    const r = await fetchJsonWithTimeout(url, REQUEST_TIMEOUT_MS, debug ? dbg.attempts : null, `${ym}-${t}`);
    if (r.ok && r.json?.retorno) {
      const units = sumUnits(r.json, code, sign, dbgItem);
      if (debug && dbgItem) dbg.attempts.push({ ym, type: t, url, status: r.status, ok: true, matchedUnits: dbgItem.matchedUnits });
      return units;
    } else {
      if (debug) dbg.attempts.push({ ym, type: t, url, status: r.status, ok: false, note: r.aborted ? "aborted/timeout" : "error" });
      return 0;
    }
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
    const pairs = await mapWithConcurrency(
      months, MONTH_CONCURRENCY,
      async (ym) => await computeMonthTotal({ ym, code, debug, dbg })
    );

    const payload = { ok:true, presentation_code: code, from: fromYM, to: toYM, series: pairs };
    if (debug) payload._debug = dbg;
    return res.status(200).json(payload);
  } catch (e) {
    return res.status(502).json({ ok:false, error: String(e?.message || e) });
  }
};
