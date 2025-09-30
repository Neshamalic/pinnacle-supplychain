// api/mm-proxy.js
const MM_BASE = process.env.VITE_MM_BASE || "https://pinnacle.managermas.cl/api/stock";
const MM_RUT  = process.env.VITE_MM_RUT  || "77091384-5";
const TOKEN   = process.env.MANAGERMAS_TOKEN || "";

function yyyymmdd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}
function buildItemUrl(code, dt) {
  const date = dt || yyyymmdd();
  const base = MM_BASE.replace(/\/+$/, "");
  const c = encodeURIComponent(code);
  return `${base}/${encodeURIComponent(MM_RUT)}/${c}/?dets=1&resv=0&dt=${date}&con_stock=1`;
}

function readNumeric(obj, keys) {
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k)) {
      const n = Number(obj[k]);
      if (!Number.isNaN(n)) return n;
    }
  }
  return NaN;
}

// Parser robusto (agregué más claves típicas)
function parseMMStock(data) {
  const NUM_KEYS = [
    "stock","stock_total","current_stock_units","quantity","qty",
    "disponible","saldo","existencia","units","stock_disponible",
    "stock_total_disponible","on_hand","available"
  ];

  if (typeof data === "number") return Math.max(0, Math.round(data));
  if (Array.isArray(data)) {
    const s = data.reduce((acc, it) => acc + (Number(readNumeric(it, NUM_KEYS)) || 0), 0);
    return Math.max(0, Math.round(s));
  }
  if (data && typeof data === "object") {
    const direct = readNumeric(data, NUM_KEYS);
    if (Number.isFinite(direct)) return Math.max(0, Math.round(direct));

    for (const k of ["dets","details","items","rows","data","productos","result","results"]) {
      const arr = data[k];
      if (Array.isArray(arr)) {
        const s = arr.reduce((acc, it) => acc + (Number(readNumeric(it, NUM_KEYS)) || 0), 0);
        if (s > 0) return Math.max(0, Math.round(s));
      }
    }

    // búsqueda profunda simple
    try {
      const json = JSON.stringify(data);
      const matches = json.match(/"(stock|stock_total|current_stock_units|quantity|qty|disponible|saldo|existencia|units|stock_disponible|on_hand|available)"\s*:\s*([0-9.]+)/gi);
      if (matches) {
        const total = matches.reduce((acc, m) => {
          const num = Number(m.split(":")[1]);
          return acc + (Number.isFinite(num) ? num : 0);
        }, 0);
        if (total > 0) return Math.round(total);
      }
    } catch {}
  }
  return 0;
}

async function fetchMM(url, scheme /* "Token" | "Bearer" */) {
  const headers = {};
  if (TOKEN) headers.Authorization = `${scheme} ${TOKEN}`;
  const r = await fetch(url, { method: "GET", headers });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { res: r, bodyText: text, bodyJson: json };
}

async function fetchOne(code, dt, debug = false) {
  const url = buildItemUrl(code, dt);

  // 1) Intento con "Token"
  let attempt = await fetchMM(url, "Token");
  if (attempt.res.status === 401) {
    // 2) Reintento con "Bearer"
    attempt = await fetchMM(url, "Bearer");
  }

  const { res, bodyText, bodyJson } = attempt;
  if (!res.ok) {
    return debug
      ? { code, ok: false, status: res.status, url, body: bodyJson ?? bodyText, stock: 0 }
      : { code, ok: false, error: `HTTP ${res.status}`, stock: 0 };
  }

  const stock = parseMMStock(bodyJson ?? bodyText);
  return debug
    ? { code, ok: true, url, status: res.status, parsed: stock, body: bodyJson ?? bodyText }
    : { code, ok: true, stock };
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Use GET" });

  const { code, codes, dt, debug } = req.query || {};
  const dbg = String(debug || "").trim() === "1";

  try {
    if (codes) {
      const list = String(codes).split(",").map(s => s.trim()).filter(Boolean);
      if (list.length > 200) return res.status(400).json({ ok: false, error: "Demasiados códigos (máx 200)" });

      const results = await Promise.all(list.map(c => fetchOne(c, dt, dbg)));
      if (dbg) return res.status(200).json({ ok: true, dt: dt || yyyymmdd(), results });

      const map = {};
      for (const r of results) map[r.code] = r.ok ? r.stock : 0;
      return res.status(200).json({ ok: true, dt: dt || yyyymmdd(), stocks: map });
    }

    if (code) {
      const r = await fetchOne(String(code).trim(), dt, dbg);
      return res.status(r.ok ? 200 : 502).json(dbg ? r : (r.ok ? { ok: true, dt: dt || yyyymmdd(), code: r.code, stock: r.stock } : { ok: false, error: r.error || "Error remoto", stock: 0 }));
    }

    return res.status(400).json({ ok: false, error: "Falta ?code o ?codes" });
  } catch (err) {
    return res.status(502).json({ ok: false, error: String(err?.message || err) });
  }
};
