// api/mm-sales.js
// /api/mm-sales?presentation_code=PC00063&from=2025-08&to=2025-09&fast=1&max=2&debug=1
const BASE  = (process.env.VITE_MM_BASE_PUBLIC || "https://pinnacle.managermas.cl/api").replace(/\/+$/,"");
const RUT   = (process.env.VITE_MM_RUT || "77091384-5").trim();
const TOKEN = (process.env.MANAGERMAS_TOKEN || "").replace(/\s+/g,"").trim();

const PER_REQUEST_TIMEOUT_MS = Number(process.env.MM_REQ_TIMEOUT_MS || 8000);  // 8s por request
const GLOBAL_TIMEOUT_MS      = Number(process.env.MM_GLOBAL_TIMEOUT_MS || 20000); // 20s total

const DOC_TYPES = ["FAVE","NCVE","NDVE"]; // Facturas, Notas Crédito, Notas Débito

function monthStartEnd(ym){
  const [y,m] = ym.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2,"0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`;
  return { start, end };
}
function yearMonthRange(fromYM, toYM){
  const [fy,fm] = fromYM.split("-").map(Number);
  const [ty,tm] = toYM.split("-").map(Number);
  const out = [];
  let y = fy, m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2,"0")}`);
    m += 1; if (m > 12) { m = 1; y += 1; }
  }
  return out;
}
function signForDocType(t){
  if (t === "NCVE") return -1;    // Nota de Crédito resta
  if (t === "FAVE" || t === "NDVE") return +1; // Factura/Nota Débito suman
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
function withTimeout(promise, ms, reason="timeout"){
  const ac = new AbortController();
  const t = setTimeout(()=> ac.abort(reason), ms);
  return {
    run: () => promise(ac.signal).finally(()=>clearTimeout(t)),
    signal: ac.signal
  };
}

async function fetchJson(url, signal) {
  const headers = { "Accept": "application/json" };
  if (TOKEN) headers.Authorization = `Token ${TOKEN}`;
  const r = await fetch(url, { headers, signal });
  const text = await r.text();
  try {
    const json = JSON.parse(text);
    return { ok: r.ok, status: r.status, json, text };
  } catch {
    return { ok: r.ok, status: r.status, json: null, text };
  }
}
function buildDocUrl({ type, rut, df, dt }){
  // /documents/{rut}/{type}/V/?df=YYYYMMDD&dt=YYYYMMDD&details=1
  const u = new URL(`${BASE}/documents/${encodeURIComponent(rut)}/${type}/V/`);
  u.searchParams.set("df", df);
  u.searchParams.set("dt", dt);
  u.searchParams.set("details", "1");
  return u.toString();
}

// Pequeña cola de concurrencia (máx 2 simultáneas)
async function runLimited(tasks, limit=2){
  const results = [];
  let idx = 0;
  let running = 0;
  return await new Promise((resolve) => {
    const next = () => {
      if (idx >= tasks.length && running === 0) return resolve(results);
      while (running < limit && idx < tasks.length) {
        const curr = tasks[idx++];
        running++;
        curr().then((r)=>results.push(r))
              .catch((e)=>results.push({ error: String(e?.message||e)}))
              .finally(()=>{ running--; next(); });
      }
    };
    next();
  });
}

module.exports = async (req, res) => {
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

  // Fechas por defecto (últimos 12 meses)
  const now = new Date();
  const defTo   = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const past = new Date(now.getFullYear(), now.getMonth()-11, 1);
  const defFrom = `${past.getFullYear()}-${String(past.getMonth()+1).padStart(2,"0")}`;
  const fromYM = from || defFrom;
  const toYM   = to   || defTo;

  // Rango mes a mes (y recorte por max)
  let months = yearMonthRange(fromYM, toYM);
  if (fast && months.length > max) months = months.slice(-max);

  const started = Date.now();
  const globalAbort = new AbortController();
  const gtimeout = setTimeout(()=>globalAbort.abort("global-timeout"), GLOBAL_TIMEOUT_MS);

  const attempts = [];
  const skipped = [];

  try {
    const series = [];

    // Creamos una lista de tareas (cada tarea = 1 mes x 3 doc-types)
    const tasks = [];
    for (const ym of months) {
      const { start, end } = monthStartEnd(ym);
      const df = start.replace(/-/g, "");
      const dt = end.replace(/-/g, "");

      tasks.push(async () => {
        let monthUnits = 0;
        for (const type of DOC_TYPES) {
          // Timeout por request
          const wrapped = withTimeout(async (signal) => {
            const url = buildDocUrl({ type, rut: RUT, df, dt });
            const r = await fetchJson(url, signal);
            if (debug) attempts.push({ ym, type, url, status: r.status, ok: r.ok });
            if (!r.ok || r.status >= 400) {
              skipped.push({ ym, type, reason: `HTTP ${r.status}` });
              continue;
            }
            monthUnits += parseUnitsFromDocs(r.json||{}, code, type);
          }, PER_REQUEST_TIMEOUT_MS, "req-timeout");
          try {
            await wrapped.run();
          } catch (e) {
            skipped.push({ ym, type, reason: String(e?.message||e) });
          }
        }
        series.push([ym, monthUnits]);
      });
    }

    // Ejecutar con concurrencia limitada
    await runLimited(tasks, fast ? 2 : 1);

    clearTimeout(gtimeout);

    const payload = {
      ok: true,
      presentation_code: code,
      from: months.at(0) || fromYM,
      to:   months.at(-1) || toYM,
      series: series.sort((a,b)=>a[0].localeCompare(b[0])),
    };

    if (skipped.length) payload.partial = true;
    if (debug) payload._debug = {
      base: BASE, rut: RUT,
      elapsed_ms: Date.now() - started,
      attempts, skipped
    };

    return res.status(200).json(payload);
  } catch (err) {
    clearTimeout(gtimeout);
    const msg = globalAbort.signal.aborted ? "Global timeout" : String(err?.message||err);
    return res.status(504).json({ ok:false, error: msg });
  }
};


