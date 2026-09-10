import { base44 } from "@/api/base44Client";

const PAD = 6;

const DEFAULT_PREFIXES = {
  sale: "VTA",
  quote: "COT",
  purchase: "COMP",
  order: "ORD",
  invoice: "FAC",
};

export function getPrefix(company, type) {
  if (!company) return DEFAULT_PREFIXES[type];
  return company[type + "_prefix"] || DEFAULT_PREFIXES[type];
}

export function prefixForInvoiceType(company, invoiceType) {
  switch (invoiceType) {
    case "Cotización": return getPrefix(company, "quote");
    case "Nota crédito": return "NC";
    case "Recibo de pago":
    case "Comprobante de abono": return "RB";
    case "Proforma": return "PRO";
    case "Factura de taller": return "FT";
    default: return getPrefix(company, "invoice");
  }
}

function extractSeq(numStr, prefix) {
  if (!numStr || typeof numStr !== "string") return 0;
  const p = prefix + "-";
  if (!numStr.startsWith(p)) return 0;
  const m = numStr.slice(p.length).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

export async function getNextDocNumber(entityName, prefix) {
  try {
    const records = await base44.entities[entityName].list(null, 1000);
    let max = 0;
    for (const r of records) {
      const n = extractSeq(r.number, prefix);
      if (n > max) max = n;
    }
    return `${prefix}-${String(max + 1).padStart(PAD, "0")}`;
  } catch (e) {
    return `${prefix}-${String(1).padStart(PAD, "0")}`;
  }
}