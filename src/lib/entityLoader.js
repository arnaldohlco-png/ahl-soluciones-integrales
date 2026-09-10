import { base44 } from "@/api/base44Client";

// Carga TODOS los registros de una entidad paginando en lotes de 500,
// sin importar cuántos existan. sortField: "-created_date" (default) | "-date" | etc.
export async function fetchAll(entityName, sortField = "-created_date") {
  const batch = 500;
  let skip = 0;
  const all = [];
  while (true) {
    const part = await base44.entities[entityName].list(sortField, batch, skip);
    all.push(...part);
    if (part.length < batch) break;
    skip += batch;
  }
  return all;
}