// src/lib/utils.js

// En producción usar SIEMPRE el proxy del propio dominio.
// En desarrollo puedes dejar directo a GAS si quieres.
const DEV_GAS_URL =
  'https://script.google.com/macros/s/AKfycbxQ-sLWW04v6hdL6WaWd3aiaWL9fOD-Thu0kqEIAjpncIB9Rv7BZ7k9psAUWTxwsJdL/exec';
const PROD_PROXY_URL = '/api/gas-proxy';

// Si tienes VITE_SHEETS_API_URL, lo respetamos (opcional).
const ENV_URL = (import.meta?.env?.VITE_SHEETS_API_URL || '').trim();

// 👉 Usa el proxy en producción (Vercel); en dev puedes usar URL directa
export const API_BASE = ENV_URL || (import.meta.env.DEV ? DEV_GAS_URL : PROD_PROXY_URL);
export const API_URL = API_BASE;

async function parseAsJsonSafe(res) {
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  const text = await res.text();
  if (ct.includes('application/json')) { try { return JSON.parse(text); } catch {} }
  const lower = text.toLowerCase();
  if (lower.includes('<html') && (lower.includes('captcha') || lower.includes('unusual traffic') || lower.includes('introduce los caracteres'))) {
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

/* (dejo tus formatters y badgeClass si los tenías aquí; si no, omite esta parte) */

