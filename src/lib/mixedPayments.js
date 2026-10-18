import { needsBank } from "@/components/BankAccountSelect";

export const newLine = (method = "Efectivo") => ({ method, amount: "", bank_account: "" });

// Normaliza líneas de pago. Si no hay montos y emptyMeansFull, se toma el total completo con la primera línea.
export function resolveLines(lines, total, emptyMeansFull = true) {
  let used = (lines || []).filter((l) => Number(l.amount) > 0).map((l) => ({ ...l, amount: Number(l.amount) }));
  if (used.length === 0 && emptyMeansFull && lines?.[0]) used = [{ ...lines[0], amount: total }];
  const paid = used.reduce((s, l) => s + l.amount, 0);
  const remaining = Math.max(0, total - paid);
  const change = Math.max(0, paid - total);
  const cash = used.filter((l) => l.method === "Efectivo").reduce((s, l) => s + l.amount, 0);
  let error = "";
  if (used.some((l) => needsBank(l.method) && !l.bank_account)) error = "Selecciona la cuenta bancaria receptora.";
  else if (change > cash) error = "El pago excede el total. Solo el efectivo puede generar cambio.";
  // Líneas netas de cambio (el cambio sale del efectivo)
  let toDeduct = change;
  const net = used.map((l) => {
    if (l.method === "Efectivo" && toDeduct > 0) {
      const d = Math.min(l.amount, toDeduct);
      toDeduct -= d;
      return { ...l, amount: l.amount - d };
    }
    return l;
  }).filter((l) => l.amount > 0);
  return { used, net, paid, remaining, change, error };
}

// Método resumen para campos legacy (payment_method)
export const summaryMethod = (used) => {
  const set = [...new Set(used.map((l) => l.method))];
  return set.length === 1 ? set[0] : "Otros";
};