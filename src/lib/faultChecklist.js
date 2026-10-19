export const NO_FAULTS_NOTE = "Sin fallas reportadas";

export function parseChecklist(raw) {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// Reconstruye los puntos a partir del texto libre (una falla por línea), conservando los ya solucionados
export function buildChecklist(text, prev) {
  const done = new Map(parseChecklist(prev).map((i) => [i.text, !!i.done]));
  return (text || "")
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => ({ text: t, done: done.get(t) || false }));
}

export function pendingFaults(order) {
  if (order?.has_faults !== "si") return [];
  return parseChecklist(order.fault_checklist).filter((i) => !i.done);
}

export function pendingMessage(order) {
  const p = pendingFaults(order);
  if (!p.length) return "";
  return `No se puede cerrar la orden. Fallas sin solucionar:\n- ${p.map((i) => i.text).join("\n- ")}`;
}