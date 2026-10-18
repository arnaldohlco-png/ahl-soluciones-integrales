// Comisiones por técnico en una orden: cada servicio puede tener su propio técnico (item.technician_id);
// si no lo tiene, se usa el técnico general de la orden (compatibilidad con órdenes anteriores).
export const parseOrderItems = (o) => {
  try { return JSON.parse(o.service_items || "[]"); } catch { return []; }
};

// Devuelve { [technicianId]: baseDeComision } excluyendo productos y servicios de terceros
export function techBases(o, isTercero) {
  const out = {};
  parseOrderItems(o)
    .filter((i) => String(i.type || "").toLowerCase() === "servicio")
    .filter((i) => !isTercero(i))
    .forEach((i) => {
      const tid = i.technician_id || o.technician_id || "_sin";
      out[tid] = (out[tid] || 0) + (Number(i.subtotal) || 0);
    });
  return out;
}

const paidList = (o) => {
  try { const l = JSON.parse(o.commission_paid_techs || "null"); return Array.isArray(l) ? l : null; } catch { return null; }
};

// ¿Ya se pagó la comisión de este técnico en la orden?
export function isPaidFor(o, tid) {
  const l = paidList(o);
  return l ? l.includes(tid) : !!o.commission_paid;
}

export function nextPaidState(o, tid, allTechIds) {
  const l = paidList(o) || [];
  const list = Array.from(new Set([...l, tid]));
  return {
    commission_paid_techs: JSON.stringify(list),
    commission_paid: allTechIds.every((t) => list.includes(t)),
  };
}