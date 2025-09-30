// api/mm-sales.js
// /api/mm-sales?presentation_code=PC00063&from=2025-08&to=2025-09&fast=1&max=1&debug=1

const BASE  = (process.env.VITE_MM_BASE_PUBLIC || "https://pinnacle.managermas.cl/api").replace(/\/+$/,"");
const RUT   = (process.env.VITE_MM_RUT || "77091384-5").trim();
const TOKEN = (process.env.MANAGERMAS_TOKEN || "").replace(/\s+/g,"").trim();

// Tunables
const PER_REQUEST_TIMEOUT_MS = Number(process.env.MM_REQ_TIMEOUT_MS || 8000);   // 8s por request a ManagerMas
const GLOBAL_TIMEOUT_MS      = Number(process.env.MM_GLOBAL_TIMEOUT_MS || 20000); // 20s por toda la función

const DOC_TYPES = ["FAVE","NCVE","NDVE"]; // Facturas, NC, ND

function monthStartEnd(ym){
  const [y,m] = String(ym||"").split("-").map(Number);
  if (!y || !m) return null;
  const start = `${y}-${String(m).padStart(2,"0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`;
  return { start, end };
}
function yearMonthRange(fromYM, toYM){
  const [fy,fm] = String(fromYM||"").split("-").map(Number);
  const [ty,tm] = String(toYM||"").split("-").map(Number);
  if (!fy || !fm || !ty || !tm) return [];
  const out = [];
  let y = fy, m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2,"0")}`);
    m += 1; if (m > 12) { m = 1; y += 1; }
  }
  return out;
}
function signForDocType(t){
  if (t === "NCVE") return -1;
  if (t === "FAVE" || t === "NDVE") return +1;
  return 0;
}
function get(o, keys, dflt){
  for (const k of keys) if (o && Object.prototype.hasOwnProperty.call(o, k)) return o[k];
  return dflt;
}
function parseUnitsFromDocs(json, code, type){
  const sign = signForDocType(type);
  if (!sign) return 0;
  const data = get(json, ["data","items","rows"], []);
  let acc = 0;
  for (const doc of (Array.isArray(data) ? data : [])) {
    const det = get(doc, ["detalle","detalles","items","lineas"], []);
    for (const it of (Array.isArray(det) ? det : [])) {
      const lineCode = String(get(it,["cod_prod","codigo","sku","producto_codigo","presentation_code"],"")).trim();
      if (lineCode === code) {
        const qty = Number(get(it,["cantidad","qty","unidades","units"],0) || 0);
        acc += sign * qty;
      }
    }
  }
  return acc;
}

// Timeout que NO aborta el fetch: evita AbortError (el fetch puede seguir en background)
async function withSoftTimeout(promise, ms){
  let timer;
  try {
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("timeout")), ms);
    });
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonSafe(url){
  try {
    const headers = { "Accept": "application/json" };
    if (TOKEN) headers.Authorization = `Token ${TOKEN}`;
    const r = await withSoftTimeout(fetch(url, { headers }), PER_REQUEST_TIMEOUT_MS);
    const text = await r.text().catch(()=> "");
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { ok: r.ok, status: r.status, json, text };
  } catch (e) {
    return { ok: false, status: 0, json: null, text: String(e?.message||e) };
  }
}

// Concurrencia limitada
async function runLimited(tasks, limit=2){
  const results = [];
  let idx = 0, running = 0;
  return await new Promise((resolve) => {
    const next = () => {
      if (idx >= tasks.length && running === 0) return resolve(results);
      while (running < limit && idx < tasks.length) {
        const curr = tasks[idx++];
        running++;
        curr().then((r)=>results.push(r))
              .catch((e)=>results.push({ error: String(e?.message||e) }))
              .finally(()=>{ running--; next(); });
      }
    };
    next();
  });
}

function buildDocUrl({ type, rut, df, dt }){
  const u = new URL(`${BASE}/documents/${encodeURIComponent(rut)}/${type}/V/`);
  u.searchParams.set("df", df);
  u.searchParams.set("dt", dt);
  u.searchParams.set("details", "1");
  return u.toString();
}

module.exports = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Origin","*");
    res.setHeader("Access-Control-Allow-Methods","GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers","Content-Type");
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "GET") return res.status(405).json({ ok:false, error:"Use GET" });

    const code  = String(req.query?.presentation_code || req.query?.code || "").trim();
    const from  = String(req.query?.from || "").trim();
    const to    = String(req.query?.to || "").trim();
    const fast  = String(req.query?.fast || "").trim() === "1";
    const max   = Math.max(1, Number(req.query?.max || 12));
    const debug = String(req.query?.debug || "").trim() === "1";

    if (!code) return res.status(400).json({ ok:false, error:'Falta ?presentation_code=PC00063' });

    // Defaults (últimos 12 meses)
    const now = new Date();
    const defTo   = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    const past = new Date(now.getFullYear(), now.getMonth()-11, 1);
    const defFrom = `${past.getFullYear()}-${String(past.getMonth()+1).padStart(2,"0")}`;

    const fromYM = from || defFrom;
    const toYM   = to   || defTo;

    let months = yearMonthRange(fromYM, toYM);
    if (fast && months.length > max) months = months.slice(-max);
    if (!months.length) {
      return res.status(200).json({ ok:true, presentation_code: code, from: fromYM, to: toYM, series: [] });
    }

    const started = Date.now();
    const attempts = [];
    const skipped  = [];

    // Timeout global suave
    let globalTimeoutHit = false;
    const globalTimer = setTimeout(()=>{ globalTimeoutHit = true; }, GLOBAL_TIMEOUT_MS);

    const series = [];
    const tasks = [];

    for (const ym of months) {
      const m = monthStartEnd(ym);
      if (!m) { skipped.push({ ym, reason: "invalid-month" }); continue; }
      const df = m.start.replace(/-/g,"");
      const dt = m.end.replace(/-/g,"");

      tasks.push(async () => {
        let units = 0;
        for (const type of DOC_TYPES) {
          if (globalTimeoutHit) { skipped.push({ ym, type, reason: "global-timeout" }); break; }
          const url = buildDocUrl({ type, rut: RUT, df, dt });
          const r = await fetchJsonSafe(url);
          if (debug) attempts.push({ ym, type, url, status: r.status, ok: r.ok });
          if (!r.ok || r.status >= 400) {
            skipped.push({ ym, type, reason: r.status ? `HTTP ${r.status}` : r.text || "fetch-failed" });
            continue;
          }
          try {
            units += parseUnitsFromDocs(r.json || {}, code, type);
          } catch (e) {
            skipped.push({ ym, type, reason: "parse-error" });
          }
        }
        series.push([ym, units]);
      });
    }

    await runLimited(tasks, fast ? 2 : 1);
    clearTimeout(globalTimer);

    const payload = {
      ok: true,
      presentation_code: code,
      from: months[0],
      to: months[months.length-1],
      series: series.sort((a,b)=> a[0].localeCompare(b[0])),
    };
    if (skipped.length) payload.partial = true;
    if (debug) payload._debug = {
      base: BASE, rut: RUT,
      elapsed_ms: Date.now() - started,
      attempts, skipped
    };

    return res.status(200).json(payload);
  } catch (err) {
    // Nunca dejes que reviente sin respuesta clara
    return res.status(500).json({ ok:false, error: String(err?.message || err) });
  }
};

