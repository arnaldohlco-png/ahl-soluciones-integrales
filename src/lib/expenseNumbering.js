import { base44 } from "@/api/base44Client";

const PREFIX = "SOP";
const seqOf = (n) => {
  const m = typeof n === "string" && n.startsWith(PREFIX + "-") ? n.match(/(\d+)$/) : null;
  return m ? parseInt(m[1], 10) : 0;
};
const fmtNum = (n) => `${PREFIX}-${String(n).padStart(6, "0")}`;

// Siguiente consecutivo global según los gastos existentes
export function nextExpenseNumber(list) {
  return fmtNum(list.reduce((max, e) => Math.max(max, seqOf(e.number)), 0) + 1);
}

// Asigna consecutivo (por orden de creación) a los gastos que no tienen; devuelve la lista actualizada
export async function backfillExpenseNumbers(list) {
  const missing = list.filter((e) => !e.number).sort((a, b) => String(a.created_date).localeCompare(String(b.created_date)));
  if (missing.length === 0) return list;
  let max = list.reduce((m, e) => Math.max(m, seqOf(e.number)), 0);
  const assigned = {};
  for (const e of missing) {
    max += 1;
    assigned[e.id] = fmtNum(max);
    await base44.entities.Expense.update(e.id, { number: assigned[e.id] });
  }
  return list.map((e) => (assigned[e.id] ? { ...e, number: assigned[e.id] } : e));
}