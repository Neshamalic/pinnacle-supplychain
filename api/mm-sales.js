// api/mm-sales.js
// Uso: /api/mm-sales?presentation_code=PC00063&from=2025-08&to=2025-09&debug=1

const PUBLIC_BASE =
  (process.env.VITE_MM_BASE_PUBLIC || "https://pinnacle.managermas.cl/api").replace(/\/+$/, "");
const TOKEN = String(process.env.MANAGERMAS_TOKEN || "").replace(/\s+/g, "").trim();

// RUT opcional (muchos tenants lo requieren para /documentos)
const ENV_RUT = String(process.env.MM_RUT || process.env.VITE_MM_RUT || "").trim();

function yearMonthRange(fromYM, toYM) {
  const [fy, fm] = fromYM.split("-").map(Number);
  const [ty, tm] = toYM.split("-").map(Number);
  const out = [];
  let y = fy, m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}
function monthStartEnd(ym) {
  const [y, m] = ym.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}
function padYM(ym) {
  if (!ym) return ym;
  const [y, m] = String(ym).split("-");
  if (!y || !m) return ym;
  return `${y}-${String(Number(m)).padStart(2, "0")}`;
}

function buildCandidateUrls({ base, from, to, code, rut }) {
  // Parámetros comunes
  const params = new URLSearchParams({
    modulo: "ventas",
    con_detalle: "1",
    estado: "emitido",
    fecha_desde: from,
    fecha_hasta: to,
    cod_prod: code,
  });

  const urls = [];

  // 1) /api/documentos
  urls.push(`${base}/documentos?${params.toString()}`);

  if (rut) {
    // 2) /api/{rut}/documentos
    urls.push(`${base}/${encodeURIComponent(rut)}/documentos?${params.toString()}`);

    // 3) /api/documentos?rut={rut}
    const p2 = new URLSearchParams(params);
    p2.set("rut", rut);
    urls.push(`${base}/documentos?${p2.toString()}`);

    // 4) /api/documentos?empresa_rut={rut}
    const p3 = new URLSearchParams(params);
    p3.set("empresa_rut", rut);
    urls.push(`${base}/documentos?${p3.toString()}`);
  }

  // Elimina duplicados por si acaso
  return Array.from(new Set(urls));
}

async function fetchJson(url, scheme) {
  const headers = { Accept: "application/json" };
  if (TOKEN) headers.Authorization = `${scheme} ${TOKEN}`;
  const r = await fetch(url, { headers });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { ok: r.ok, status: r.status, json, text };
}

async function fetchDocsWithAuthFallback(url) {
  // Intenta con "Token", si 401 prueba "Bearer"
  let a = await fetchJson(url, "Token");
  if (a.status === 401) a = await fetchJson(url, "Bearer");
  return a;
}

function docSign(tipo) {
  // 33, 34, 39, 56 => ventas (positivo), 61 => Nota de crédito (negativo)
  const t = Number(tipo);
  if (t === 61) return -1;
  if ([33, 34, 39, 56].includes(t)) return +1;
  return 0; // otros DTEs no considerados
}

function pick(obj, keys, fallback) {
  for (const k of keys) if (obj && Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
  return fallback;
}

function aggregateMonth(json, code) {
  const data = pick(json, ["data", "items", "rows", "result"], []);
  let acc = 0;
  for (const doc of (Array.isArray(data) ? data : [])) {
    const signo = docSign(pick(doc, ["tipo_dte", "tipoDte", "tipo"], 0));
    if (!signo) continue;
    const det = pick(doc, ["detalle", "detalles", "items", "lineas"], []);
    for (const it of (Array.isArray(det) ? det : [])) {
      const cod = String(pick(it, ["cod_prod", "codigo", "sku", "producto_codigo", "presentation_code"], "")).trim();
      if (!cod || cod !== code) continue;
      const qty = Number(pick(it, ["cantidad", "qty", "unidades", "units"], 0) || 0);
      acc += signo * qty;
    }
  }
  return acc;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Use GET" });

  const inputCode = String(req.query?.presentation_code || req.query?.code || "").trim();
  let fromYm = padYM(String(req.query?.from || "").trim());
  let toYm   = padYM(String(req.query?.to   || "").trim());
  const debug = String(req.query?.debug || "") === "1";

  if (!inputCode) {
    return res.status(400).json({ ok: false, error: 'Falta ?presentation_code=PC00063 (o ?code=...)' });
  }

  // Defaults: últimos 12 meses cerrados
  const now = new Date();
  const defTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const d = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const defFrom = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const from = fromYm || defFrom;
  const to = toYm || defTo;

  // Usa RUT de env, pero permite override por query (?rut=)
  const rut = String(req.query?.rut || ENV_RUT || "").trim();

  try {
    const series = [];
    const attemptsDebug = [];

    for (const ym of yearMonthRange(from, to)) {
      const { start, end } = monthStartEnd(ym);
      const candidates = buildCandidateUrls({
        base: PUBLIC_BASE, from: start, to: end, code: inputCode, rut
      });

      let monthUnits = 0;
      let got = null;

      for (const url of candidates) {
        const r = await fetchDocsWithAuthFallback(url);
        if (debug) attemptsDebug.push({ ym, url, status: r.status, sample: r.text?.slice?.(0, 180) });

        if (r.ok && r.json) {
          monthUnits = aggregateMonth(r.json, inputCode);
          got = r;
          break; // listo con esta variante
        }
      }

      // Si ninguna variante funcionó, queda 0
      series.push([ym, monthUnits]);
    }

    const payload = { ok: true, presentation_code: inputCode, from, to, series };
    if (debug) payload._debug = { base: PUBLIC_BASE, rut: rut || null, attempts: attemptsDebug.slice(0, 200) };
    return res.status(200).json(payload);
  } catch (e) {
    return res.status(502).json({ ok: false, error: String(e?.message || e) });
  }
};
