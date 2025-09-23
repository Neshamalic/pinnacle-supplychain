// src/lib/utils.js

// ⛳️ Pega aquí tu URL de Apps Script desplegada como "Web App" (termina en /exec)
export const API_BASE = 'https://script.google.com/macros/s/AKfycbwYoCEaDNboehUNuDGnbxegzONKRHL0uqS9_0BEP56nOKgiGvo6uuN_z0AaYht2q4Ua/exec';

// Utilidad para pedir JSON (GET) y manejar errores simples
export async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

// Utilidad para POST (enviamos JSON plano como text/plain para evitar CORS preflight)
export async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

// Formateadores "bonitos"
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
  if (isNaN(d)) return String(iso);
  // dd-mm-yyyy (Chile)
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// Badge helpers para colores por estado
export function badgeClass(kind, value) {
  const v = String(value || '').toLowerCase();

  // manufacturing_status: planned | in_process | ready | shipped
  if (kind === 'manufacturing') {
    if (v.includes('shipped')) return 'bg-purple-100 text-purple-800';
    if (v.includes('ready')) return 'bg-green-100 text-green-800';
    if (v.includes('process')) return 'bg-yellow-100 text-yellow-800';
    if (v.includes('plan')) return 'bg-gray-100 text-gray-800';
    return 'bg-gray-100 text-gray-800';
  }

  // transport_type: air | sea | courier
  if (kind === 'transport') {
    if (v.includes('air')) return 'bg-blue-100 text-blue-800';
    if (v.includes('sea')) return 'bg-teal-100 text-teal-800';
    if (v.includes('courier')) return 'bg-indigo-100 text-indigo-800';
    return 'bg-gray-100 text-gray-800';
  }

  return 'bg-gray-100 text-gray-800';
}
