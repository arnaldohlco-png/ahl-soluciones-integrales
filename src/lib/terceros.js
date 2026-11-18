// Un servicio es de categoría "Terceros" cuando el catálogo así lo indica.
// Estos servicios no requieren técnico asignado y no generan comisión.
export const isTerceroItem = (item, services) => {
  if (!item) return false;
  if (item.service_id && services) {
    const svc = services.find((s) => s.id === item.service_id);
    if (svc && String(svc.category || "").trim().toLowerCase() === "terceros") return true;
  }
  return /tercero/i.test(String(item.name || "").trim());
};