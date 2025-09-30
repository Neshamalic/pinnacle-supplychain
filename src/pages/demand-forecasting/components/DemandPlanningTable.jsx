import React, { useEffect, useMemo, useState } from "react";

/**
 * DemandPlanningTable (JS) – Stock desde ManagerMas (batch), resto desde GAS.
 * - Stock: /api/mm-proxy?codes=PC00063,PC00064 (token oculto en servidor)
 * - Demand: tender_items (awarded_qty/meses calendario), fallback demand.monthlydemandunits.
 * - Transit: SOLO imports con import_status en tránsito; qty de import_items; ETA mínima.
 * - Product: "CÓDIGO — NOMBRE (xPACK)"; normaliza PC000630 -> PC00063 para cruzar con catálogo/MM.
 * - Transit en tabla: Yes/No. En View: resumen + tabla por OCI.
 */

const GAS_BASE = (import.meta?.env?.VITE_SHEETS_API_URL) || "/api/gas-proxy";
const MM_PROXY = (import.meta?.env?.VITE_MM_API_PROXY) || "/api/mm-proxy";

/* ========================= Utils ========================= */
function normKey(s){return String(s||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"_")}
function pick(obj, cands){if(!obj||typeof obj!=="object")return;const m=new Map(Object.keys(obj).map(k=>[normKey(k),k]));for(const c of cands){const k=m.get(normKey(c));if(k!==undefined)return obj[k]}}
function stripAccents(s=""){return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"")}
function isTransitStatus(s=""){const x=stripAccents(String(s)).toLowerCase();return x.includes("transit")||x.includes("transito")}
function parseDateISO(x){if(!x)return;const d=new Date(x);return isNaN(d.getTime())?undefined:d}
function monthsCalendarInclusive(first,last){if(!first||!last)return 1;const y=last.getFullYear()-first.getFullYear();const m=last.getMonth()-first.getMonth();return Math.max(1,y*12+m+1)}
function addMonthsApprox(base,monthsFloat){const ms=monthsFloat*30.437*24*60*60*1000;return new Date(base.getTime()+ms)}
function formatDate(d){const yyyy=d.getFullYear();const mm=String(d.getMonth()+1).padStart(2,"0");const dd=String(d.getDate()).padStart(2,"0");return `${yyyy}-${mm}-${dd}`}
function coverageStatus(months){if(!isFinite(months)||months<=0)return"Critical";if(months<2)return"Critical";if(months<=4)return"Urgent";if(months<=6)return"Normal";return"Optimal"}

/* yyyy-mm de una fecha */
function ymOf(dateObj){
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth()+1).padStart(2,"0");
  return `${y}-${m}`;
}

/* ========================= GAS ========================= */
async function readTable(name){
  const url = `${GAS_BASE}?route=table&name=${encodeURIComponent(name)}`;
  const res = await fetch(url);
  const text = await res.text();
  if(!res.ok) throw new Error(`Error leyendo ${name}: ${res.status}`);
  let data; try{data=JSON.parse(text)}catch{return []}
  if (data && Array.isArray(data.rows)) return data.rows;
  for (const k of ["values","data","records","items"]) if (Array.isArray(data?.[k])) return data[k];
  if (data?.ok===false) throw new Error(String(data.error||`ok:false para ${name}`));
  return [];
}

/* ========================= Normalización de códigos ========================= */
function normalizeToCatalog(code, catByCode){
  let c=String(code||"").trim();
  if (catByCode.has(c)) return c;
  let t=c;
  while(t.endsWith("0")&&t.length>2){t=t.slice(0,-1);if(catByCode.has(t))return t}
  return c;
}

/* ========================= ManagerMas (batch vía proxy) ========================= */
async function readManagerMasStockBatch(codes){
  const list = Array.from(codes||[]);
  if (!list.length) return new Map();
  const qs = encodeURIComponent(list.join(","));
  const url = `${MM_PROXY}?codes=${qs}`;
  const r = await fetch(url);
  const data = await r.json().catch(()=>({}));
  const map = new Map();
  if (data?.ok && data?.stocks) {
    for (const [k,v] of Object.entries(data.stocks)) map.set(k, Number(v)||0);
  }
  return map;
}

/* ========================= Build rows ========================= */
function buildRows({ catalog, demandSheet, tenderItems, importHeaders, importItems, mmStockByCode, displayCodeByCode }){
  // Catálogo
  const catByCode = new Map();
  for (const c of (Array.isArray(catalog)?catalog:[])) {
    const code = String(pick(c,["presentation_code","presentationCode","code"])||"").trim();
    if (!code) continue;
    catByCode.set(code,{
      product_name: pick(c,["product_name","productName","name"])||"",
      package_units: Number(pick(c,["package_units","packageUnits","units_per_pack","units"])??0),
    });
  }

  // Fallback demanda desde 'demand'
  const demandMonthlyFallbackByCode = new Map();
  for (const d of (Array.isArray(demandSheet)?demandSheet:[])) {
    const raw = String(pick(d,["presentation_code","presentationCode","code"])||"").trim();
    if (!raw) continue;
    const code = normalizeToCatalog(raw, catByCode);
    const dm = Number(pick(d,["monthlydemandunits","monthly_demand_units","monthlyDemandUnits"])||0);
    if (dm>0) demandMonthlyFallbackByCode.set(code, dm);
  }

  // Demanda mensual desde tender_items
  const monthlyDemandByCode = new Map();
  for (const ti of (Array.isArray(tenderItems)?tenderItems:[])) {
    const raw = String(pick(ti,["presentation_code","presentationCode","code"])||"").trim();
    if (!raw) continue;
    const code = normalizeToCatalog(raw, catByCode);
    const awarded = Number(pick(ti,["awarded_qty","awardedQty","quantity","qty"])||0);
    const first = parseDateISO(pick(ti,["first_delivery_date","firstDeliveryDate","start_date","startDate"]));
    const last  = parseDateISO(pick(ti,["last_delivery_date","lastDeliveryDate","end_date","endDate"]));
    const months = monthsCalendarInclusive(first,last);
    const monthly = months>0 ? awarded/months : 0;
    monthlyDemandByCode.set(code,(monthlyDemandByCode.get(code)||0)+monthly);
  }

  // IMPORTS en tránsito -> por OCI con ETA mínima
  const transitHeaderByOCI = new Map(); // OCI => { eta }
  for (const h of (Array.isArray(importHeaders)?importHeaders:[])) {
    const oci = String(pick(h,["oci_number","ociNumber","oci"])||"").trim();
    if (!oci) continue;
    const statusRaw = pick(h,["import_status","importStatus","status"])||"";
    if (!isTransitStatus(statusRaw)) continue;
    const etaRaw = pick(h,["eta","arrival_date","arrivalDate","eta_date","ETD"]);
    const eta = parseDateISO(etaRaw);
    const prev = transitHeaderByOCI.get(oci);
    if (!prev || (eta && (!prev.eta || eta.getTime()<prev.eta.getTime()))) {
      transitHeaderByOCI.set(oci,{eta: eta||prev?.eta});
    }
  }

  // IMPORT_ITEMS: sumar por código SOLO si su OCI está en tránsito
  const transitByCode = new Map(); // code => [{oci, qty, eta}]
  for (const ii of (Array.isArray(importItems)?importItems:[])) {
    const oci = String(pick(ii,["oci_number","ociNumber","oci"])||"").trim();
    const head = transitHeaderByOCI.get(oci);
    if (!head) continue;

    const raw = String(pick(ii,[
      "presentation_code","presentationCode","product_code","productCode","sku","item_code","presentation"
    ])||"").trim();
    if (!raw) continue;
    const code = normalizeToCatalog(raw, catByCode);

    const qty = Number(pick(ii,["qty","quantity","units","units_qty","qty_units"])||0);
    const list = transitByCode.get(code)||[];
    list.push({ oci, qty, eta: head.eta });
    transitByCode.set(code, list);
  }

  // Universo de códigos
  const allCodes = new Set([
    ...Array.from(catByCode.keys()),
    ...Array.from(monthlyDemandByCode.keys()),
    ...Array.from(demandMonthlyFallbackByCode.keys()),
  ]);

  const today = new Date();
  const rows = Array.from(allCodes).map((normCode)=>{
    const cat = catByCode.get(normCode)||{};
    const productName = cat.product_name||"";
    const packageUnits = cat.package_units||0;

    // Stock desde ManagerMas (mapa viene con códigos normalizados)
    let stock = mmStockByCode.get(normCode);
    if (stock == null) stock = 0;

    // Demanda mensual
    let demandM = Number(monthlyDemandByCode.get(normCode)||0);
    if (!demandM) demandM = Number(demandMonthlyFallbackByCode.get(normCode)||0);

    const months = demandM>0 ? stock/demandM : Infinity;
    const outOfStockDate = (demandM>0 && stock>0) ? addMonthsApprox(today,stock/demandM) : undefined;

    const trList = (transitByCode.get(normCode)||[])
      .slice()
      .sort((a,b)=>{
        const ta=a.eta? a.eta.getTime():Infinity;
        const tb=b.eta? b.eta.getTime():Infinity;
        return ta-tb;
      });

    const transitTotal = trList.reduce((acc,t)=>acc+(Number(t.qty)||0),0);
    const transitEta = trList.length ? trList[0].eta : undefined;

    return {
      presentation_code: normCode,                                // normalizado
      product_code: (displayCodeByCode.get(normCode)||normCode),  // como venía en demand/tender
      product_name: productName,
      package_units: packageUnits,
      currentStockUnits: stock,
      monthlyDemandUnits: demandM,
      monthSupply: months,
      status: coverageStatus(months),
      outOfStockDate,
      transitList: trList,
      transitTotal,
      transitEta,
    };
  });

  return rows;
}

/* ========================= Componente ========================= */
export default function DemandPlanningTable(){
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState(null);
  const [rows,setRows] = useState([]);
  const [viewRow,setViewRow] = useState(null);

  useEffect(()=>{
    let cancelled=false;
    (async ()=>{
      try{
        setLoading(true); setError(null);

        // 1) Lee planillas necesarias (GAS)
        const [demandSheet,tenderItems,importHeaders,importItems,catalog] = await Promise.all([
          readTable("demand"),
          readTable("tender_items"),
          readTable("imports"),
          readTable("import_items"),
          readTable("product_presentation_master"),
        ]);

        // 2) Prepara catálogo para normalizar
        const catByCode = new Map();
        for (const c of (Array.isArray(catalog)?catalog:[])) {
          const code = String(pick(c,["presentation_code","presentationCode","code"])||"").trim();
          if (code) catByCode.set(code,true);
        }

        // 3) Mapa de "código para mostrar" (raw) por código normalizado
        const displayCodeByCode = new Map();
        for (const d of (Array.isArray(demandSheet)?demandSheet:[])) {
          const raw = String(pick(d,["presentation_code","presentationCode","code"])||"").trim();
          if (!raw) continue;
          const norm = normalizeToCatalog(raw,catByCode);
          if (!displayCodeByCode.has(norm)) displayCodeByCode.set(norm, raw);
        }
        for (const ti of (Array.isArray(tenderItems)?tenderItems:[])) {
          const raw = String(pick(ti,["presentation_code","presentationCode","code"])||"").trim();
          if (!raw) continue;
          const norm = normalizeToCatalog(raw,catByCode);
          if (!displayCodeByCode.has(norm)) displayCodeByCode.set(norm, raw);
        }

        // 4) Códigos normalizados a consultar en ManagerMas
        const codesForAPI = new Set(displayCodeByCode.size ? Array.from(displayCodeByCode.keys())
                                                           : Array.from(catByCode.keys()));

        // 5) Trae stocks (batch) desde ManagerMas
        const mmStockByCode = await readManagerMasStockBatch(codesForAPI);

        // 6) Construye filas finales
        const built = buildRows({
          catalog, demandSheet, tenderItems, importHeaders, importItems,
          mmStockByCode, displayCodeByCode
        });

        if(!cancelled) setRows(built);
      }catch(e){
        if(!cancelled) setError(e?.message||"Error cargando Demand Planning");
      }finally{
        if(!cancelled) setLoading(false);
      }
    })();
    return ()=>{cancelled=true};
  },[]);

  const columns = useMemo(()=>[
    { key:"product", header:"Product" },
    { key:"currentStockUnits", header:"Stock" },
    { key:"monthlyDemandUnits", header:"Demand (monthly)" },
    { key:"monthSupply", header:"Month Supply" },
    { key:"status", header:"Status" },
    { key:"outOfStockDate", header:"Date Out of Stock" },
    { key:"transit", header:"Transit" },
    { key:"actions", header:"Actions" },
  ],[]);

  function onView(row){ setViewRow(row); }

  // NUEVO: abrir Sales con code + rango últimos 12 meses
  function onOpenSales(presentationCode){
    const now = new Date();
    const fromDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const fromYM = ymOf(fromDate);
    const toYM   = ymOf(now);
    const url = `/sales-analytics?presentation_code=${encodeURIComponent(presentationCode)}&from=${encodeURIComponent(fromYM)}&to=${encodeURIComponent(toYM)}`;
    window.open(url, "_blank"); // nueva pestaña
  }

  if(loading) return <div className="p-4">Cargando Demand Planning…</div>;

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Demand Planning</h2>
        <div className="text-sm text-gray-500">{rows.length} productos</div>
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          {error}
          <div className="mt-1">
            Revisa <code>VITE_MM_API_PROXY</code>, <code>VITE_MM_BASE</code>, <code>VITE_MM_RUT</code> y la variable de servidor <code>MANAGERMAS_TOKEN</code>.
          </div>
        </div>
      )}

      <div className="overflow-x-auto border rounded-2xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>{columns.map(c=><th key={c.key} className="px-3 py-2 text-left font-medium text-gray-600">{c.header}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map(r=>{
              const hasTransit = r.transitList && r.transitList.length>0;
              return (
                <tr key={r.presentation_code} className="border-t align-top">
                  <td className="px-3 py-2">
                    <div className="font-semibold">
                      {r.product_code}
                      {(r.product_name||r.package_units) && " — "}
                      {r.product_name||""}{r.package_units?` (x${r.package_units})`:""}
                    </div>
                  </td>
                  <td className="px-3 py-2">{Math.round(r.currentStockUnits)}</td>
                  <td className="px-3 py-2">{r.monthlyDemandUnits? r.monthlyDemandUnits.toFixed(2):"0.00"}</td>
                  <td className="px-3 py-2">{Number.isFinite(r.monthSupply)? r.monthSupply.toFixed(2):"∞"}</td>
                  <td className="px-3 py-2"><StatusPill status={r.status}/></td>
                  <td className="px-3 py-2">{r.outOfStockDate? formatDate(r.outOfStockDate):"—"}</td>
                  <td className="px-3 py-2"><TransitPill yes={hasTransit}/></td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button className="px-2 py-1 rounded-xl border hover:bg-gray-50" onClick={()=>onView(r)}>View</button>
                      {/* Reemplazo: antes era "Update stock" */}
                      <button className="px-2 py-1 rounded-xl border hover:bg-gray-50" onClick={()=>onOpenSales(r.presentation_code)}>
                        Sales
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length===0 && (
              <tr><td className="px-3 py-6 text-sm text-gray-500" colSpan={columns.length}>No hay productos para mostrar.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal View */}
      {viewRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl p-4 w-full max-w-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Producto {viewRow.product_code}</h3>
              <button className="text-gray-500 hover:text-gray-800" onClick={()=>setViewRow(null)}>✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <InfoItem label="Nombre" value={viewRow.product_name||"—"} />
                <InfoItem label="Pack" value={viewRow.package_units?`x ${viewRow.package_units}`:"—"} />
                <InfoItem label="Stock (ManagerMas)" value={String(viewRow.currentStockUnits)} />
                <InfoItem label="Demand (monthly)" value={viewRow.monthlyDemandUnits?.toFixed(2)||"0.00"} />
                <InfoItem label="Month Supply" value={Number.isFinite(viewRow.monthSupply)?viewRow.monthSupply.toFixed(2):"∞"} />
                <InfoItem label="Status" value={viewRow.status} />
                <InfoItem label="Date OOS" value={viewRow.outOfStockDate?formatDate(viewRow.outOfStockDate):"—"} />
              </div>

              <div className="mt-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Transit</h4>
                  <TransitPill yes={viewRow.transitList && viewRow.transitList.length>0} />
                </div>

                {viewRow.transitList && viewRow.transitList.length>0 ? (
                  <>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <InfoItem label="Total en tránsito" value={`${viewRow.transitTotal} u.`} />
                      <InfoItem label="ETA más próxima" value={viewRow.transitEta?formatDate(viewRow.transitEta):"—"} />
                    </div>
                    <div className="mt-3 overflow-hidden rounded-xl border">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-gray-600 font-medium">OCI</th>
                            <th className="px-3 py-2 text-right text-gray-600 font-medium">Qty</th>
                            <th className="px-3 py-2 text-left text-gray-600 font-medium">ETA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewRow.transitList.map((t,i)=>(
                            <tr key={i} className="border-t">
                              <td className="px-3 py-2">{t.oci}</td>
                              <td className="px-3 py-2 text-right">{t.qty||0}</td>
                              <td className="px-3 py-2">{t.eta?formatDate(t.eta):"—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ):(<div className="mt-1 text-gray-500">No hay unidades en tránsito.</div>)}
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-1.5 rounded-xl border hover:bg-gray-50" onClick={()=>setViewRow(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========================= UI helpers ========================= */
function StatusPill({status}){
  const base="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium";
  const colors={Critical:"bg-red-100 text-red-700",Urgent:"bg-orange-100 text-orange-700",Normal:"bg-yellow-100 text-yellow-700",Optimal:"bg-green-100 text-green-700","N/A":"bg-gray-100 text-gray-600"};
  return <span className={`${base} ${colors[status]||colors["N/A"]}`}>{status}</span>;
}
function TransitPill({yes}){
  const base="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium";
  return yes? <span className={`${base} bg-green-100 text-green-700`}>Yes</span>
            : <span className={`${base} bg-gray-100 text-gray-600`}>No</span>;
}
function InfoItem({label,value}){
  return (<div className="flex flex-col"><span className="text-gray-500">{label}</span><span className="font-medium">{value}</span></div>);
}

