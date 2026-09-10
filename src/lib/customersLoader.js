import { base44 } from "@/api/base44Client";

// Loads ALL customers paginating in batches, so no customer is missing
// regardless of how many records exist. Pair with entityCache for speed.
export async function fetchAllCustomers() {
  const batch = 500;
  let skip = 0;
  const all = [];
  while (true) {
    const part = await base44.entities.Customer.list("-created_date", batch, skip);
    all.push(...part);
    if (part.length < batch) break;
    skip += batch;
  }
  return all;
}