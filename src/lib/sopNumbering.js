import { base44 } from "@/api/base44Client";
import { fetchAll } from "@/lib/entityLoader";

// Serie global SOP compartida por gastos, pagos de comisiones y comprobantes de garantía
const PREFIX = "SOP";
const seqOf = (n) => {
  const m = typeof n === "string" && n.startsWith(PREFIX + "-") ? n.match(/(\d+)$/) : null;
  return m ? parseInt(m[1], 10) : 0;
};
const fmtNum = (n) => `${PREFIX}-${String(n).padStart(6, "0")}`;
const warrantyNumber = (o) => { try { return JSON.parse(o.warranty_snapshot || "null")?.number; } catch { return null; } };

async function currentMax() {
  const [exp, pay, ord] = await Promise.all([fetchAll("Expense"), fetchAll("CommissionPayment"), fetchAll("ServiceOrder")]);
  return Math.max(
    0,
    ...exp.map((e) => seqOf(e.number)),
    ...pay.map((p) => seqOf(p.number)),
    ...ord.map((o) => seqOf(warrantyNumber(o)))
  );
}

export async function nextSopNumber() {
  return fmtNum((await currentMax()) + 1);
}

// Asigna consecutivo (por orden de creación) a los registros sin número; devuelve la lista actualizada
export async function backfillNumbers(entityName, list) {
  const missing = list.filter((r) => !r.number).sort((a, b) => String(a.created_date).localeCompare(String(b.created_date)));
  if (missing.length === 0) return list;
  let max = await currentMax();
  const assigned = {};
  for (const r of missing) {
    max += 1;
    assigned[r.id] = fmtNum(max);
    await base44.entities[entityName].update(r.id, { number: assigned[r.id] });
  }
  return list.map((r) => (assigned[r.id] ? { ...r, number: assigned[r.id] } : r));
}