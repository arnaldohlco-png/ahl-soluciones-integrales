// Helper centralizado para el cálculo de IVA.
// Respeta la configuración de la empresa (company.charges_iva).
// USAR SIEMPRE este helper en todos los módulos que calculen o muestren IVA
// para que una empresa "No responsable de IVA" no muestre ni cobre IVA.

// Determina si la empresa cobra IVA.
// company.charges_iva es la fuente de verdad; si no está definido, se asume
// responsable solo si es persona jurídica (fallback por defecto).
export const chargesIva = (company) => {
  if (!company) return true;
  if (company.charges_iva === true) return true;
  if (company.charges_iva === false) return false;
  return company.document_type === "Persona jurídica";
};

// Calcula el IVA total de una lista de items.
// Cada item puede tener `iva_rate` (numérico, porcentaje). Si no, usa defaultRate (19).
// Retorna 0 si la empresa no es responsable de IVA.
export const calcIva = (items, company, defaultRate = 19) => {
  if (!chargesIva(company)) return 0;
  return items.reduce((sum, it) => {
    const rate = Number(it.iva_rate ?? defaultRate);
    return sum + (Number(it.subtotal) || 0) * rate / 100;
  }, 0);
};

// Calcula el IVA sobre un subtotal plano (cuando no hay tasas por item).
export const calcIvaFlat = (subtotal, company, rate = 19) => {
  if (!chargesIva(company)) return 0;
  return (Number(subtotal) || 0) * rate / 100;
};