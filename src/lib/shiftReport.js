import { base44 } from "@/api/base44Client";
import { isApertura, isCierre, turnoWindow } from "@/lib/turnos";

const sum = (arr, f) => arr.reduce((s, x) => s + (f(x) || 0), 0);
const VOID_PREFIX = "Anulación de venta";
export const isVoidReversal = (m) => (m?.description || "").startsWith(VOID_PREFIX);
export const voidReversalDescription = (num) => `${VOID_PREFIX} ${num || ""}`.trim();

export async function loadVoids(register, openDate, closeDate) {
  const page = await base44.entities.SaleVoid.filter({ register_type: register }, { sort: "-date", limit: 500 });
  const start = new Date(openDate).getTime();
  const end = closeDate ? new Date(closeDate).getTime() : Date.now();
  return (page.items || []).filter((v) => {
    const t = new Date(v.date).getTime();
    return t >= start && t <= end;
  });
}

// Ventas (registros Sale) cuyos cobros ocurrieron dentro de la ventana del turno.
export function saleMovementsInWindow(list, openDate, closeDate) {
  const start = new Date(openDate).getTime();
  const end = closeDate ? new Date(closeDate).getTime() : Date.now();
  return list.filter((m) => {
    const t = new Date(m.date).getTime();
    return m.category === "Venta" && m.type === "Entrada" && m.reference_id && t >= start && t <= end;
  });
}

export async function loadSalesByIds(ids) {
  if (ids.length === 0) return [];
  const page = await base44.entities.Sale.filter({ id: { $in: ids } }, { limit: 500 });
  return page.items || [];
}

// Construye el reporte completo del turno (objeto serializable).
export async function buildShiftReport({ list, register, turno, counted, responsible, closeDate, voids }) {
  const voidedIds = new Set(voids.map((v) => v.sale_id));
  const ventaMovs = saleMovementsInWindow(list, turno.openDate, closeDate).filter((m) => !voidedIds.has(m.reference_id));
  const saleIds = [...new Set(ventaMovs.map((m) => m.reference_id))];
  const sales = await loadSalesByIds(saleIds);

  const byMethod = {};
  ventaMovs.forEach((m) => {
    const k = m.payment_method || "Otros";
    byMethod[k] = (byMethod[k] || 0) + (m.amount || 0);
  });

  const parsed = sales.map((s) => {
    let items = [];
    try { items = JSON.parse(s.items || "[]"); } catch (_) { /* ignore */ }
    return { sale: s, items };
  });
  const productIds = [...new Set(parsed.flatMap((p) => p.items.map((i) => i.product_id)).filter(Boolean))];
  const catById = {};
  if (productIds.length > 0) {
    const page = await base44.entities.Product.filter({ id: { $in: productIds } }, { limit: 500, fields: ["category"] });
    (page.items || []).forEach((p) => { catById[p.id] = p.category; });
  }
  const svcPage = await base44.entities.Service.list("-created_date", 1000);
  const svcList = svcPage.items || svcPage;
  const svcById = {};
  const svcByName = {};
  svcList.forEach((s) => { svcById[s.id] = s; svcByName[(s.name || "").trim().toLowerCase()] = s; });
  const products = {};
  const services = {};
  const categories = {};
  parsed.forEach(({ items }) => items.forEach((it) => {
    const qty = Number(it.quantity) || 0;
    const val = Number(it.subtotal) || qty * (Number(it.unit_price) || 0);
    const name = it.name || "Sin nombre";
    const svc = (it.service_id && svcById[it.service_id])
      || (it.product_id && !catById[it.product_id] && svcById[it.product_id])
      || (it.type === "Servicio" ? svcByName[name.trim().toLowerCase()] : null)
      || (!it.product_id && svcByName[name.trim().toLowerCase()]);
    const isService = it.type === "Servicio" || !!svc;
    const cat = isService
      ? (svc?.category || "Servicios")
      : (it.product_id ? (catById[it.product_id] || "Otros") : "Otros");
    const bucket = isService ? services : products;
    bucket[name] = bucket[name] || { name, category: cat, qty: 0, value: 0 };
    bucket[name].qty += qty;
    bucket[name].value += val;
    categories[cat] = categories[cat] || { category: cat, qty: 0, value: 0 };
    categories[cat].qty += qty;
    categories[cat].value += val;
  }));

  const window = turnoWindow(list, register, turno.openDate, closeDate)
    .filter((m) => !isApertura(m) && !isCierre(m));
  const outflows = window
    .filter((m) => m.type === "Salida" && !isVoidReversal(m))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((m) => ({ date: m.date, category: m.category, description: m.description || "", payment_method: m.payment_method, amount: m.amount || 0 }));
  const entradas = sum(window.filter((m) => m.type === "Entrada"), (m) => m.amount);
  const salidas = sum(window.filter((m) => m.type === "Salida"), (m) => m.amount);
  const expected = (turno.base || 0) + entradas - salidas;
  const countedN = Number(counted) || 0;

  return {
    register, turno_number: turno.turno, responsible,
    shift_vendedor: turno.vendedor || "", open_date: turno.openDate, close_date: closeDate,
    sales_total: sum(ventaMovs, (m) => m.amount),
    sales_by_method: Object.entries(byMethod).map(([method, amount]) => ({ method, amount })),
    by_product: Object.values(products).sort((a, b) => b.value - a.value),
    by_service: Object.values(services).sort((a, b) => b.value - a.value),
    by_category: Object.values(categories).sort((a, b) => b.value - a.value),
    outflows, outflows_total: sum(outflows, (o) => o.amount),
    base: turno.base || 0, entradas, salidas, expected, counted: countedN, difference: countedN - expected,
    transactions: sales.length,
    voids: voids.map((v) => ({ date: v.date, sale_number: v.sale_number, amount: v.amount, reason: v.reason || "", authorized_by: v.authorized_by })),
    voids_total: sum(voids, (v) => v.amount),
  };
}