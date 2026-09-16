// Helpers para anticipos de órdenes de servicio (JSON string en ServiceOrder.anticipos)

export const parseAnticipos = (s) => {
  try {
    const v = JSON.parse(s || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

export const sumAnticipos = (s) =>
  parseAnticipos(s).reduce((sum, a) => sum + (Number(a?.amount) || 0), 0);

// Saldo pendiente de una orden dado su total y anticipos
export const saldoPendiente = (total, anticiposStr) =>
  Math.max(0, (Number(total) || 0) - sumAnticipos(anticiposStr));