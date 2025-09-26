// src/lib/utils.js

// En producción usamos SIEMPRE el proxy del propio dominio.
// En desarrollo puedes usar directo a GAS si prefieres.
const DEV_GAS_URL =
  'https://script.google.com/macros/s/AKfycbxQ-sLWW04v6hdL6WaWd3aiaWL9fOD-Thu0kqEIAjpncIB9Rv7BZ7k9psAUWTxwsJdL/exec';
const PROD_PROXY_URL = '/api/gas-proxy';

// Si tienes VITE_SHEETS_API_URL, lo respetamos (opcional).
const ENV_URL = (import.meta?.env?.VITE_SHEETS_API_URL || '').trim();

// 👉 Usa el proxy en producción; en dev puedes ir directo o también al proxy
export const API_BASE = ENV_URL || (import.meta.env.DEV ? DEV_GAS_URL : PROD_PROXY_URL);
export const API_URL = API_BASE; // alias por compatibilidad

/* =============== helpers con detección de captcha =============== */
async function parseAsJsonSafe(res) {
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  const text = await res.text();
  if (ct.includes('application/json')) {
    try { return JSON.parse(text); } catch {}
  }
  const lower = text.toLowerCase();
  const looksHtml =
    lower.includes('<html') &&
    (lower.includes('captcha') || lower.includes('unusual traffic') || lower.includes('introduce los caracteres'));
  if (looksHtml) {
    throw new Error('Google mostró un CAPTCHA. El proxy /api/gas-proxy lo evita.');
  }
  try { return JSON.parse(text); } catch { throw new Error('La API no devolvió JSON válido.'); }
}

export async function fetchJSON(url) {
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await parseAsJsonSafe(res);
  if (json?.ok === false) throw new Error(json?.error || 'Error de API');
  return json;
}

export async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await parseAsJsonSafe(res);
  if (json?.ok === false) throw new Error(json?.error || 'Error de API');
  return json;
}

/* ================= Formatters ================== */
export function formatCurrency(n) {
  const num = Number(n ?? 0);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}
export function formatNumber(n) {
  const num = Number(n ?? 0);
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);
}
export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`; // dd-mm-yyyy (Chile)
}

/* ================ Badges / chips ================= */
export function badgeClass(kind, value) {
  const v = String(value || '').toLowerCase();
  if (kind === 'manufacturing') {
    if (v.includes('shipped')) return 'bg-purple-100 text-purple-800';
    if (v.includes('ready')) return 'bg-green-100 text-green-800';
    if (v.includes('process')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  }
  if (kind === 'transport') {
    if (v.includes('air')) return 'bg-blue-100 text-blue-800';
    if (v.includes('sea')) return 'bg-teal-100 text-teal-800';
    if (v.includes('courier')) return 'bg-indigo-100 text-indigo-800';
    return 'bg-gray-100 text-gray-800';
  }
  if (kind === 'import') {
    if (v.includes('warehouse')) return 'bg-purple-100 text-purple-800';
    if (v.includes('transit')) return 'bg-amber-100 text-amber-800';
    if (v.includes('deliv') || v.includes('arriv') || v.includes('cleared'))
      return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  }
  return 'bg-gray-100 text-gray-800';
}

