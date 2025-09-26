// src/config/env.js
export function getApiBase() {
  const url = import.meta.env.VITE_SHEETS_API_URL || "";
  if (!url) {
    const msg = [
      "Falta configurar VITE_SHEETS_API_URL.",
      "Crea un archivo .env en la raíz del proyecto con:",
      "",
      "VITE_SHEETS_API_URL=PEGAR_AQUI_LA_URL_DE_TU_APPS_SCRIPT",
      ""
    ].join("\n");
    console.error(msg);
    throw new Error(msg);
  }
  return url.replace(/\/+$/, ""); // sin barra final
}
