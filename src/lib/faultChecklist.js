export const NO_FAULTS_TEXT = "Sin fallas reportadas";

export function parseFaults(s) {
  try {
    const a = JSON.parse(s || "[]");
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

// Devuelve los puntos pendientes si la orden tiene fallas reportadas sin solucionar
export function pendingFaults(order) {
  if (order?.fault_answer !== "si") return [];
  return parseFaults(order.fault_checklist).filter((f) => !f.solved);
}

export function pendingMessage(pending) {
  return `No se puede entregar la orden. Fallas pendientes por solucionar:\n- ${pending.map((f) => f.text).join("\n- ")}`;
}