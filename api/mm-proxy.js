// api/mm-proxy.js
// Proxy para ManagerMas con soporte batch y token del lado servidor.
// NO expone el token al cliente.

// CONFIG
const MM_BASE = process.env.VITE_MM_BASE || "https://pinnacle.managermas.cl/api/stock";
const MM_RUT  = process.env.VITE_MM_RUT  || "77091384-5";
const TOKEN   = process.env.MANAGERMAS_TOKEN || ""; // <-- token sólo en servidor

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

async function fetchOne(code, dt) {
  const url = buildItemUrl(code, dt);
  const r = await fetch(url, {
    method: "GET",
    headers: TOKEN ? { Authorization: `Token ${TOKEN}` } : {},
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}

  if (!r.ok) {
    return { code, ok: false, error: `HTTP ${r.status}`, stock: 0 };
  }

  const stock = parseMMStock(json ?? text);
  return { code, ok: true, stock };
}

// Intenta extraer un número de stock robustamente
function parseMMStock(data) {
  if (typeof data === "number") return Math.max(0, Math.round(data));
  if (Array.isArray(data)) {
    const s = data.reduce((acc, it) => acc + readNumeric(it, ["stock","stock_total","quantity","qty","disponible","saldo","existencia","units"]), 0);
    return Math.max(0, Math.round(s));
  }
  if (data && typeof data === "object") {
    const direct = readNumeric(data, ["stock","stock_total","current_stock_units","quantity","qty","disponible","saldo","existencia","units"]);
    if (Number.isFinite(direct)) return Math.max(0, Math.round(direct));
    for (const k of ["dets","details","items","rows"]) {
      const arr = data[k];
      if (Array.isArray(arr)) {
        const s = arr.reduce((acc, it) => acc + readNumeric(it, ["stock","stock_total","quantity","qty","disponible","saldo","existencia","units"]), 0);
        return Math.max(0, Math.round(s));
      }
    }
  }
  return 0;
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

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Use GET" });

  const { code, codes, dt } = req.query || {};

  try {
    if (codes) {
      // Batch: ?codes=PC00063,PC00064,PC00065
      const list = String(codes)
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

      if (list.length > 200) {
        return res.status(400).json({ ok: false, error: "Demasiados códigos (máx 200)" });
      }

      const results = await Promise.all(list.map(c => fetchOne(c, dt)));
      const map = {};
      for (const r of results) map[r.code] = r.ok ? r.stock : 0;
      return res.status(200).json({ ok: true, dt: dt || yyyymmdd(), stocks: map });
    }

    if (code) {
      // Single: ?code=PC00063
      const r = await fetchOne(String(code).trim(), dt);
      if (!r.ok) return res.status(502).json({ ok: false, error: r.error || "Error remoto", stock: 0 });
      return res.status(200).json({ ok: true, dt: dt || yyyymmdd(), code: r.code, stock: r.stock });
    }

    return res.status(400).json({ ok: false, error: "Falta ?code o ?codes" });
  } catch (err) {
    return res.status(502).json({ ok: false, error: String(err?.message || err) });
  }
};
