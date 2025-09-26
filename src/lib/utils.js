// src/lib/utils.js

// 1) Leemos primero desde variable de entorno (Vercel/local) y
//    si no existe, usamos la URL fija de respaldo (fallback).
const ENV_URL = (import.meta?.env?.VITE_SHEETS_API_URL || '').replace(/\/$/, '');
const FALLBACK_URL = 'https://script.google.com/macros/s/AKfycbxQ-sLWW04v6hdL6WaWd3aiaWL9fOD-Thu0kqEIAjpncIB9Rv7BZ7k9psAUWTxwsJdL/exec';

export const API_BASE = ENV_URL || FALLBACK_URL;

// ⚠️ Compatibilidad: hay archivos que aún usan "API_URL".
//    Exportamos el alias para que funcionen sin tocar nada más.
export const API_URL = API_BASE;

/* ================= HTTP helpers ================ */
export async function fetchJSON(url) {
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const data = await res.json().catch(() => null);
  if (!data || data.ok === false) {
    throw new Error(data?.error || 'Respuesta inválida del backend');
  }
  return data;
}

// Enviamos JSON como text/plain para evitar preflight CORS
export async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain; charset=UTF-8' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const data = await res.json().catch(() => null);
  if (!data || data.ok === false) {
    throw new Error(data?.error || 'Respuesta inválida del backend');
  }
  return data;
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
  return `${dd}-${mm}-${yyyy}`;
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
