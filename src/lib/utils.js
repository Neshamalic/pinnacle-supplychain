// src/lib/utils.js

// 👇 Pega la URL NUEVA de tu Apps Script (termina en /exec)
export const API_BASE = 'https://script.google.com/macros/s/AKfycbxQ-sLWW04v6hdL6WaWd3aiaWL9fOD-Thu0kqEIAjpncIB9Rv7BZ7k9psAUWTxwsJdL/exec';

// Intenta interpretar la respuesta como JSON. Si llega HTML (captcha), avisa.
async function parseAsJsonSafe(res) {
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  const text = await res.text(); // leemos una vez
  if (ct.includes('application/json')) {
    try { return JSON.parse(text); } catch { /* cae abajo */ }
  }
  const lower = text.toLowerCase();
  const looksHtml = lower.includes('<html') || lower.includes('captcha') || lower.includes('unusual traffic') || lower.includes('introduce los caracteres');
  if (looksHtml) {
    throw new Error('Google mostró un CAPTCHA. Abre la URL de ping en el navegador, complétalo y vuelve a intentar.');
  }
  try { return JSON.parse(text); } catch {
    throw new Error('La API no devolvió JSON válido.');
  }
}

// GET
export async function fetchJSON(url) {
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await parseAsJsonSafe(res);
  if (json?.ok === false) throw new Error(json?.error || 'Error de API');
  return json;
}

// POST (enviamos text/plain para simplificar con Apps Script)
export async function postJSON(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await parseAsJsonSafe(res);
  if (json?.ok === false) throw new Error(json?.error || 'Error de API');
  return json;
}
