// src/pages/tender-management/components/TenderDetailsModal.jsx
import React, { useMemo } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import { useSheet } from "@/lib/sheetsApi";
import { mapTenderItems } from "@/lib/adapters";
import { usePresentationCatalog } from "@/lib/catalog";

export default function TenderDetailsModal({ tender, isOpen, onClose }) {
  if (!isOpen || !tender) return null;

  // 1) Items del tender
  const { rows: allItems = [], loading } = useSheet("tender_items", mapTenderItems);
  const itemsForTender = useMemo(
    () => (allItems || []).filter((r) => r.tenderId === tender.tenderId),
    [allItems, tender?.tenderId]
  );

  // 2) Enriquecer con product_name y package_units
  const { enrich } = usePresentationCatalog();
  const items = useMemo(() => enrich(itemsForTender), [itemsForTender, enrich]);

  const fmtQty = (n) => new Intl.NumberFormat("en-US").format(n || 0);
  const fmtMoney = (n) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(
      n || 0
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
      <div className="w-full max-w-4xl rounded-xl border bg-card shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">{tender.title || tender.tenderId}</h3>
            <p className="text-sm text-muted-foreground">{tender.tenderId}</p>
          </div>
          <Button variant="ghost" onClick={onClose} iconName="X" />
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground">No products for this tender.</div>
          ) : (
            <div className="space-y-3">
              {items.map((it, idx) => (
                <div
                  key={`${it.presentationCode || idx}`}
                  className="rounded-lg border p-4 bg-muted/30 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-foreground">
                      {it.presentationCode || "—"}
                      <span className="text-muted-foreground">
                        {" "}
                        · {it.productName || "—"}{" "}
                        {it.packageUnits ? `· ${it.packageUnits} units/pkg` : ""}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Quantity: {fmtQty(it.awardedQty)} · Unit: {fmtMoney(it.unitPrice)}
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    Line total: <span className="font-medium">{fmtMoney(it.lineTotal)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

