// api/mm-sales.js
// /api/mm-sales?code=PC00063&from=2025-01&to=2025-09[&debug=1]
const BASE  = (process.env.VITE_MM_BASE_PUBLIC || "https://pinnacle.managermas.cl/api").replace(/\/+$/,'');
const TOKEN = String(process.env.MANAGERMAS_TOKEN || "").replace(/\s+/g,"").trim();
const RUT   = String(process.env.VITE_MM_RUT || "77091384-5").trim();

const VENTAS_CYCLE = "V";
const DOC_TYPES = [
  { code: "FAVE", sign: +1 },
  { code: "NDVE", sign: +1 },
  { code: "NCVE", sign: -1 },
];

// Rendimiento / robustez
const REQUEST_TIMEOUT_MS = 20000; // 20s
const MONTH_CONCURRENCY  = 2;     // 2 meses a la vez
const RETRIES            = 1;     // 1 reintento

// ---------- helpers de fecha ----------
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

// Rango → sub-rangos de N días (incluye bordes)
function splitRangeByDays(df, dt, days = 7) {
  const chunks = [];
  const start = new Date(df.slice(0,4), Number(df.slice(4,6))-1, Number(df.slice(6,8)));
  const end   = new Date(dt.slice(0,4), Number(dt.slice(4,6))-1, Number(dt.slice(6,8)));
  let cursor = new Date(start);
  while (cursor <= end) {
    const to = new Date(cursor);
    to.setDate(to.getDate() + (days - 1));
    if (to > end) to.setTime(end.getTime());
    const dfStr = `${cursor.getFullYear()}${String(cursor.getMonth()+1).padStart(2,"0")}${String(cursor.getDate()).padStart(2,"0")}`;
    const dtStr = `${to.getFullYear()}${String(to.getMonth()+1).padStart(2,"0")}${String(to.getDate()).padStart(2,"0")}`;
    chunks.push([dfStr, dtStr]);
    cursor.setDate(cursor.getDate() + days);
  }
  return chunks;
}

// ---------- fetch con timeout + retry ----------
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
      if (r.ok) return last;
      if (r.status >= 500 && k < RETRIES) continue;
      return last;
    } catch (e) {
      last = { ok: false, status: 0, json: null, text: "", aborted: (e?.name === "AbortError") };
      if (debugArr) debugArr.push({ url, error: String(e?.name || e?.message || e), attempt: k, label: attemptLabel });
      if (k < RETRIES) continue;
      return last;
    } finally {
      clearTimeout(t);
    }
  }
  return last;
}

// ---------- normalización y lectura de líneas ----------
function normalizeCode(x) {
  // Mayúsculas, remueve no-alfanum, y saca ceros de cola (PC000640 -> PC00064)
  let s = String(x || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  while (s.endsWith("0") && s.length > 2) s = s.slice(0, -1);
  return s;
}
function firstExisting(obj, keys, fallback) {
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
  }
  return fallback;
}
function extractDetailLines(doc) {
  const candidates = ["detalle", "detalles", "items", "lineas", "line_items", "detail", "detail_lines"];
  for (const key of candidates) {
    const v = doc?.[key];
    if (Array.isArray(v)) return v;
  }
  return [];
}
function readLineCode(line) {
  const direct = firstExisting(line, [
    "cod_prod","codigo","producto_codigo","coditem","codigo_item",
    "product_code","sku","codigo_prod"
  ], undefined);
  if (direct != null && direct !== "") return String(direct).trim();

  const nestedPaths = [
    ["producto","codigo"], ["producto","cod_prod"], ["item","codigo"], ["item","cod_prod"],
    ["product","code"], ["product","sku"], ["producto","sku"]
  ];
  for (const p of nestedPaths) {
    let v = line;
    for (const part of p) v = (v && typeof v === "object") ? v[part] : undefined;
    if (v != null && v !== "") return String(v).trim();
  }

  for (const [k,v] of Object.entries(line)) {
    if (typeof v === "string" && /^PC[0-9]/i.test(v)) return v.trim();
  }
  return "";
}
function readLineQty(line) {
  const qty = firstExisting(line, ["cantidad","qty","unidades","units"], 0);
  const n = Number(qty);
  return Number.isFinite(n) ? n : 0;
}

function sumUnits(payload, codeNorm, debugSink) {
  const data = Array.isArray(payload?.data) ? payload.data : [];
  let acc = 0, matched = 0;
  const sampleCodes = new Set();
  for (const doc of data) {
    const lines = extractDetailLines(doc);
    for (const ln of lines) {
      const codeRaw = readLineCode(ln);
      if (!codeRaw) continue;
      const code = normalizeCode(codeRaw);
      if (sampleCodes.size < 6) sampleCodes.add(code);
      if (code === codeNorm) {
        const qty = readLineQty(ln);
        matched += qty;
        acc += qty;
      }
    }
  }
  if (debugSink) {
    debugSink.matchedUnits = (debugSink.matchedUnits || 0) + matched;
    const prev = new Set(debugSink.sampleLineCodes || []);
    sampleCodes.forEach(c => prev.add(c));
    debugSink.sampleLineCodes = Array.from(prev);
  }
  return acc;
}

// fetch de documentos (posible chunking por tipo)
async function fetchDocsRange(type, df, dt, debug, dbgArr, label) {
  const url = `${BASE}/documents/${encodeURIComponent(RUT)}/${encodeURIComponent(type)}/${VENTAS_CYCLE}/?df=${df}&dt=${dt}&details=1`;
  return await fetchJsonWithTimeout(url, REQUEST_TIMEOUT_MS, debug ? dbgArr : null, label);
}

async function computeByType({ ym, type, sign, codeNorm, debug, dbg }) {
  const { start, end } = monthStartEnd(ym);
  const df = ymd(start), dt = ymd(end);

  // Para FAVE hacemos chunking de 7 días para evitar timeouts
  const ranges = (type === "FAVE") ? splitRangeByDays(df, dt, 7) : [[df, dt]];

  let total = 0;
  for (let i = 0; i < ranges.length; i++) {
    const [a, b] = ranges[i];
    const dbgItem = debug ? { ym, type, chunk: `${a}-${b}`, matchedUnits: 0, sampleLineCodes: [] } : null;
    const r = await fetchDocsRange(type, a, b, debug, dbg?.attempts, `${ym}-${type}#${i+1}/${ranges.length}`);
    if (r.ok && r.json?.retorno) {
      const units = sumUnits(r.json, codeNorm, dbgItem);
      total += (type === "NCVE" ? -units : +units) * sign; // sign ya es +1 en nuestra tabla
      if (debug && dbgItem) dbg.attempts.push({ ym, type, chunk: `${a}-${b}`, ok: true, status: r.status, matchedUnits: dbgItem.matchedUnits, sampleLineCodes: dbgItem.sampleLineCodes });
    } else {
      if (debug) dbg.attempts.push({ ym, type, chunk: `${a}-${b}`, ok: false, status: r.status, note: r.aborted ? "aborted/timeout" : "error" });
    }
  }
  return total;
}

async function computeMonthTotal({ ym, codeNorm, debug, dbg }) {
  const results = await Promise.all(
    DOC_TYPES.map(({ code: t, sign }) =>
      computeByType({ ym, type: t, sign, codeNorm, debug, dbg })
    )
  );
  return [ym, results.reduce((a,b)=>a+b,0)];
}

// ---------- concurrencia limitada ----------
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

// ... (deja todo lo demás igual: helpers, normalización, etc.)

// === handler (reemplazar esta función completa) ===
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ ok:false, error:"Use GET" });

  const inputCode  = String(req.query?.code || req.query?.presentation_code || "").trim();
  const debug = String(req.query?.debug || "") === "1";
  const fast  = String(req.query?.fast  || "") === "1";      // ← FAST MODE
  const maxMonths = Math.max(1, Number(req.query?.maxMonths || (fast ? 2 : 12))); // ← FAST: por defecto 2 meses

  const now = new Date();
  const defTo = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const defFrom = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,"0")}`;

  const fromYM = String(req.query?.from || defFrom);
  const toYM   = String(req.query?.to   || defTo);

  if (!inputCode)  return res.status(400).json({ ok:false, error:'Falta ?presentation_code=PC00063 (o ?code=...)' });
  if (!TOKEN)      return res.status(401).json({ ok:false, error:'MANAGERMAS_TOKEN no configurado en Vercel' });

  const dbg = debug ? { base: BASE, rut: RUT, attempts: [] } : null;
  const codeNorm = normalizeCode(inputCode);

  try {
    let months = yearMonthRange(fromYM, toYM);
    // FAST MODE: recortar para no pasarse de tiempo
    if (months.length > maxMonths) months = months.slice(-maxMonths);

    // En FAST MODE reducimos concurrencia para bajar presión
    const concurrency = fast ? 1 : MONTH_CONCURRENCY;

    // Parche simple: cuando fast=1 NO troceamos FAVE (un request por mes/tipo)
    const pairs = await mapWithConcurrency(
      months, concurrency,
      async (ym) => await computeMonthTotalFastAware({ ym, codeNorm, debug, dbg, fast })
    );

    const payload = { ok:true, presentation_code: inputCode, from: months[0], to: months[months.length-1], series: pairs };
    if (debug) payload._debug = dbg;
    return res.status(200).json(payload);
  } catch (e) {
    return res.status(502).json({ ok:false, error: String(e?.message || e) });
  }
};

// === función wrapper que respeta fast ===
async function computeMonthTotalFastAware({ ym, codeNorm, debug, dbg, fast }) {
  const types = DOC_TYPES.map(({ code, sign }) => ({ type: code, sign }));
  const results = [];
  for (const { type, sign } of types) {
    const { start, end } = monthStartEnd(ym);
    const df = ymd(start), dt = ymd(end);
    // FAST MODE: 1 solo rango por tipo
    const ranges = fast ? [[df, dt]] : (type === "FAVE" ? splitRangeByDays(df, dt, 7) : [[df, dt]]);

    let total = 0;
    for (let i = 0; i < ranges.length; i++) {
      const [a, b] = ranges[i];
      const dbgItem = debug ? { ym, type, chunk: `${a}-${b}`, matchedUnits: 0, sampleLineCodes: [] } : null;
      const r = await fetchDocsRange(type, a, b, debug, dbg?.attempts, `${ym}-${type}#${i+1}/${ranges.length}`);
      if (r.ok && r.json?.retorno) {
        const units = sumUnits(r.json, codeNorm, dbgItem);
        total += (type === "NCVE" ? -units : +units);
        if (debug && dbgItem) dbg.attempts.push({ ym, type, chunk: `${a}-${b}`, ok: true, status: r.status, matchedUnits: dbgItem.matchedUnits, sampleLineCodes: dbgItem.sampleLineCodes });
      } else {
        if (debug) dbg.attempts.push({ ym, type, chunk: `${a}-${b}`, ok: false, status: r.status, note: r.aborted ? "aborted/timeout" : "error" });
      }
    }
    results.push(total);
  }
  return [ym, results.reduce((a,b)=>a+b,0)];
}


