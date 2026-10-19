// Total de unidades: suma de las cantidades de todos los ítems (JSON string o arreglo)
export function countUnits(items) {
  let arr = items;
  if (typeof items === "string") {
    try { arr = JSON.parse(items || "[]"); } catch { arr = []; }
  }
  if (!Array.isArray(arr)) return 0;
  return arr.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
}