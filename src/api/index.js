export async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }
  return await response.json();
}

// Example usage for Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function fetchPurchaseOrders() {
  const url = `${SUPABASE_URL}/rest/v1/purchase_orders?select=*`;
  return await fetchJSON(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
    },
  });
}
