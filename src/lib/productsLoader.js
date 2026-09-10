import { base44 } from "@/api/base44Client";

// Loads ALL products paginating in batches, so no product is missing
// regardless of catalog size. The entity cache (entityCache.js) makes
// repeated calls across modules nearly instant.
export async function fetchAllProducts() {
  const batch = 500;
  let skip = 0;
  const all = [];
  while (true) {
    const part = await base44.entities.Product.list("-created_date", batch, skip);
    all.push(...part);
    if (part.length < batch) break;
    skip += batch;
  }
  return all;
}