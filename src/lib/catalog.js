// src/lib/catalog.js
import { useMemo, useCallback } from "react";
import { useSheet } from "@/lib/sheetsApi";
import { mapPresentationMaster } from "@/lib/adapters";

/**
 * Carga product_presentation_master y entrega:
 * - byCode: { [presentationCode]: { productName, packageUnits, ... } }
 * - enrich(items): añade productName y packageUnits a cada item por presentationCode
 */
export function usePresentationCatalog() {
  const { rows = [], loading, error } = useSheet(
    "product_presentation_master",
    mapPresentationMaster
  );

  const byCode = useMemo(() => {
    const m = Object.create(null);
    for (const r of rows) {
      if (!r?.presentationCode) continue;
      m[r.presentationCode] = r; // {presentationCode, productName, packageUnits}
    }
    return m;
  }, [rows]);

  const enrich = useCallback(
    (items = []) =>
      items.map((it) => {
        const ref = byCode[it.presentationCode] || {};
        return {
          ...it,
          productName: ref.productName || "",
          packageUnits: Number.isFinite(ref.packageUnits) ? ref.packageUnits : null,
        };
      }),
    [byCode]
  );

  return { loading, error, byCode, rows, enrich };
}
