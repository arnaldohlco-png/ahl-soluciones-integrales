import { localDateKey, todayLocalKey } from "@/lib/localDate";

export const isCreditSale = (s) => s.payment_type === "Crédito";

// Ventas a crédito originadas durante un turno (la venta guarda solo fecha, se compara por día).
export function creditSalesInTurno(sales, openDate, closeDate) {
  const start = localDateKey(new Date(openDate));
  const end = closeDate ? localDateKey(new Date(closeDate)) : todayLocalKey();
  const rows = (sales || []).filter((s) => isCreditSale(s) && s.date && s.date >= start && s.date <= end);
  return { rows, total: rows.reduce((t, s) => t + (s.total || 0), 0) };
}