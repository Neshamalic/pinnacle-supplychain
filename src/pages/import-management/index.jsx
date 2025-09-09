// src/pages/import-management/index.jsx
import React, { useMemo, useState } from "react";
import Icon from "@/components/AppIcon";
import Button from "@/components/ui/Button";

import { useSheet } from "@/lib/sheetsApi";
import { mapImports, mapImportItems } from "@/lib/adapters";
import ImportStatusBadge from "./components/ImportStatusBadge";

/* ============== Helpers de formato ============== */
const fmtCLP = (n) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(+n) ? +n : 0);

const fmtDate = (d) => {
  if (!d) return "—";
  const dd = new Date(d);
  if (Number.isNaN(dd.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(dd);
};

/* Nota de layout:
   Si esta página NO mostraba el top-nav era porque no estaba
   dentro del mismo layout que el resto. No tocamos la app shell;
   solo devolvemos markup estilo “pinnacleflow”. Asegúrate de
   renderizarla bajo el mismo layout que Tenders/Orders.
*/

const ImportManagement = () => {
  /* ============== Estado UI ============== */
  const [search, setSearch] = useState("");
  const [transportFilter, setTransportFilter] = useState("");
  const [qcFilter, setQcFilter] = useState("");
  const [customsFilter, setCustomsFilter] = useState("");

  // Drawer lateral
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState("details"); // 'details' | 'timeline'
  const [activeImport, setActiveImport] = useState(null);

  /* ============== Datos ============== */
  const { rows: imports = [], loading, error } = useSheet("imports", mapImports);
  const { rows: importItems = [] } = useSheet("import_items", mapImportItems);

  /* ============== Calcular métricas y filtros ============== */
  const decoratedImports = useMemo(() => {
    return (imports || []).map((imp) => {
      // Tomamos un “total cost CLP” si existe en la hoja (nombres probables)
      const raw = imp?._raw || {};
      const costClp =
        Number(imp.costClp ?? raw.total_cost_clp ?? raw.cost_clp ?? raw.total_cost ?? 0) || 0;

      return {
        ...imp,
        costClp,
      };
    });
  }, [imports]);

  const filtered = useMemo(() => {
    let list = decoratedImports;

    if (search) {
      const s = search.toLowerCase();
      list = list.filter((r) => {
        const id = String(r?.ociNumber || "").toLowerCase();
        const loc = String(r?.destination || r?.location || "").toLowerCase();
        return id.includes(s) || loc.includes(s);
      });
    }
    if (transportFilter) list = list.filter((r) => (r.transportType || "") === transportFilter);
    if (qcFilter) list = list.filter((r) => (r.status || "") === qcFilter);
    if (customsFilter) list = list.filter((r) => (r.customsStatus || "") === customsFilter);

    return list;
  }, [decoratedImports, search, transportFilter, qcFilter, customsFilter]);

  const summary = useMemo(() => {
    const active = filtered.length;
    const pendingQc = filtered.filter((r) => r.status === "pending").length;
    const customs = filtered.filter((r) => (r.customsStatus || "").includes("custom")).length;
    const totalValue = filtered.reduce((acc, r) => acc + (r.costClp || 0), 0);
    return { active, pendingQc, customs, totalValue };
  }, [filtered]);

  /* ============== Acciones ============== */
  const openDrawer = (row, mode) => {
    setActiveImport(row);
    setDrawerMode(mode);
    setDrawerOpen(true);
  };
  const closeDrawer = () => {
    setDrawerOpen(false);
    setActiveImport(null);
  };

  const itemsForImport = (oci) =>
    (importItems || []).filter((it) => String(it.ociNumber || "") === String(oci || ""));

  /* ============== Render ============== */
  return (
    <div className="px-6 py-6 space-y-6">
      {/* Top bar con título + acciones */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">Dashboard › Import Management</div>
          <h1 className="text-2xl font-semibold text-foreground mt-1">Import Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track incoming shipments from arrival through quality control completion
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" iconName="Download">Export Data</Button>
          <Button variant="default" iconName="RefreshCcw">Refresh Data</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          icon="Package"
          title="Active Imports"
          value={summary.active}
          delta="+12%"
          tone="primary"
        />
        <SummaryCard
          icon="ShieldAlert"
          title="Pending QC"
          value={summary.pendingQc}
          delta="-5%"
          tone="warning"
        />
        <SummaryCard
          icon="ClipboardCheck"
          title="Customs Clearance"
          value={summary.customs}
          delta="+8%"
          tone="success"
        />
        <SummaryCard
          icon="DollarSign"
          title="Total Import Value"
          value={fmtCLP(summary.totalValue)}
          delta="+15%"
          tone="accent"
        />
      </div>

      {/* Filtros */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="col-span-1 md:col-span-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shipments…"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
            />
          </div>

          <FilterSelect
            label="Transport Type"
            value={transportFilter}
            onChange={setTransportFilter}
            options={[
              { label: "All", value: "" },
              { label: "Air", value: "air" },
              { label: "Sea", value: "sea" },
              { label: "Land", value: "land" },
            ]}
          />
          <FilterSelect
            label="QC Status"
            value={qcFilter}
            onChange={setQcFilter}
            options={[
              { label: "All", value: "" },
              { label: "Pending", value: "pending" },
              { label: "In Progress", value: "in-progress" },
              { label: "Approved", value: "approved" },
            ]}
          />
          <FilterSelect
            label="Customs Status"
            value={customsFilter}
            onChange={setCustomsFilter}
            options={[
              { label: "All", value: "" },
              { label: "In Customs", value: "in customs" },
              { label: "Cleared", value: "cleared" },
            ]}
          />

          <div className="flex items-end">
            <Button variant="ghost" onClick={() => {
              setSearch("");
              setTransportFilter("");
              setQcFilter("");
              setCustomsFilter("");
            }}>
              Reset Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <Th>Shipment ID</Th>
                <Th>Arrival Date</Th>
                <Th>Transport</Th>
                <Th>QC Status</Th>
                <Th>Customs</Th>
                <Th className="text-right">Total Cost</Th>
                <Th>Location</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr><td colSpan={8} className="px-6 py-6 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {error && (
                <tr><td colSpan={8} className="px-6 py-6 text-center text-red-600">Error: {String(error)}</td></tr>
              )}
              {!loading && !error && filtered.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-6 text-center text-muted-foreground">No imports found</td></tr>
              )}

              {filtered.map((row) => (
                <tr key={row.id || row.ociNumber}>
                  <Td>{row.ociNumber || "—"}</Td>
                  <Td>{fmtDate(row.eta)}</Td>
                  <Td className="capitalize">{row.transportType || "—"}</Td>
                  <Td>
                    <ImportStatusBadge type="qc" value={row.status} />
                  </Td>
                  <Td>
                    <ImportStatusBadge type="customs" value={row.customsStatus} />
                  </Td>
                  <Td className="text-right">{fmtCLP(row.costClp)}</Td>
                  <Td>{row.destination || row.location || "—"}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="Eye"
                        onClick={() => openDrawer(row, "details")}
                      >
                        View Details
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="Clock3"
                        onClick={() => openDrawer(row, "timeline")}
                      >
                        View Timeline
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer lateral */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={closeDrawer} />
          <div className="w-full sm:w-[520px] h-full bg-card border-l border-border shadow-xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                {drawerMode === "details" ? "Import Details" : "Import Timeline"}
              </h3>
              <Button variant="ghost" size="icon" onClick={closeDrawer}>
                <Icon name="X" />
              </Button>
            </div>

            {drawerMode === "details" && activeImport && (
              <div className="space-y-4">
                <KeyVal label="Shipment ID" value={activeImport.ociNumber} />
                <KeyVal label="Arrival Date" value={fmtDate(activeImport.eta)} />
                <KeyVal label="Transport" value={activeImport.transportType} />
                <KeyVal label="QC Status" value={<ImportStatusBadge type="qc" value={activeImport.status} />} />
                <KeyVal label="Customs" value={<ImportStatusBadge type="customs" value={activeImport.customsStatus} />} />
                <KeyVal label="Total Cost" value={fmtCLP(activeImport.costClp)} />
                <KeyVal label="Location" value={activeImport.destination || activeImport.location || "—"} />

                <div className="pt-2">
                  <h4 className="font-medium mb-2">Items</h4>
                  <div className="space-y-2">
                    {itemsForImport(activeImport.ociNumber).map((it) => (
                      <div key={`${it.ociNumber}-${it.presentationCode}-${it.lotNumber || ""}`} className="border border-border rounded-md p-3">
                        <div className="text-sm text-muted-foreground">Code</div>
                        <div className="font-medium">{it.presentationCode || "—"}</div>
                        {it.lotNumber && (
                          <>
                            <div className="text-sm text-muted-foreground mt-2">Lot</div>
                            <div className="font-medium">{it.lotNumber}</div>
                          </>
                        )}
                        {Number(it.qty) ? (
                          <>
                            <div className="text-sm text-muted-foreground mt-2">Qty</div>
                            <div className="font-medium">{it.qty}</div>
                          </>
                        ) : null}
                      </div>
                    ))}
                    {itemsForImport(activeImport.ociNumber).length === 0 && (
                      <div className="text-sm text-muted-foreground">No items for this import.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {drawerMode === "timeline" && activeImport && (
              <div className="space-y-6">
                {/* Mini “timeline” simple basada en campos comunes */}
                <TimelineItem
                  icon="PlaneTakeoff"
                  title="Departure from origin"
                  subtitle="Shipment created"
                  done
                />
                <TimelineItem
                  icon="Ship"
                  title="In transit"
                  subtitle="Freight in progress"
                  done={activeImport.transportType !== "air" ? true : false}
                />
                <TimelineItem
                  icon="Truck"
                  title="Arrival at Port"
                  subtitle={activeImport.destination || "—"}
                  done={true}
                />
                <TimelineItem
                  icon="ShieldCheck"
                  title="Customs"
                  subtitle={(activeImport.customsStatus || "").toUpperCase()}
                  done={(activeImport.customsStatus || "") === "cleared"}
                />
                <TimelineItem
                  icon="CheckCircle"
                  title="QC"
                  subtitle={(activeImport.status || "").toUpperCase()}
                  done={(activeImport.status || "") === "approved"}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ============== Subcomponentes UI ============== */

const Th = ({ children, className = "" }) => (
  <th className={`px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider ${className}`}>
    {children}
  </th>
);
const Td = ({ children, className = "" }) => (
  <td className={`px-6 py-4 text-sm text-foreground ${className}`}>{children}</td>
);

const FilterSelect = ({ label, value, onChange, options }) => (
  <div className="space-y-1">
    <div className="text-sm text-muted-foreground">{label}</div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
    >
      {options.map((o) => (
        <option key={o.label} value={o.value}>{o.label}</option>
      ))}
    </select>
  </div>
);

const SummaryCard = ({ icon, title, value, delta, tone = "primary" }) => {
  const tones = {
    primary: "bg-blue-50 text-blue-700 ring-blue-200",
    warning: "bg-yellow-50 text-yellow-700 ring-yellow-200",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    accent: "bg-violet-50 text-violet-700 ring-violet-200",
  };
  return (
    <div className="bg-card rounded-lg border border-border p-4 flex items-center justify-between">
      <div>
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="text-xl font-semibold text-foreground mt-1">{value}</div>
      </div>
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ring-1 ${tones[tone]}`}>
        <Icon name={icon} />
        <span className="text-sm font-medium">{delta}</span>
      </div>
    </div>
  );
};

const KeyVal = ({ label, value }) => (
  <div>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="font-medium">{value ?? "—"}</div>
  </div>
);

const TimelineItem = ({ icon, title, subtitle, done }) => (
  <div className="flex items-start gap-3">
    <div className={`mt-1 rounded-full p-2 ${done ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
      <Icon name={icon} size={16} />
    </div>
    <div>
      <div className="font-medium">{title}</div>
      <div className="text-sm text-muted-foreground">{subtitle}</div>
    </div>
  </div>
);

export default ImportManagement;

