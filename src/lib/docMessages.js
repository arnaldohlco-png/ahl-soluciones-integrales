import moment from "moment";

const fmt = (n) => `$${(Number(n) || 0).toLocaleString("es-CO")}`;
const fmtDate = (d) => (d ? moment(d).format("DD/MM/YYYY") : "—");
const parseItems = (s) => { try { return JSON.parse(s || "[]"); } catch { return []; } };

const motoLabel = (m) => (m ? `${m.brand || ""} ${m.model || ""}${m.plate ? ` (Placa: ${m.plate})` : ""}` : "");

const listItems = (items) =>
  (items || []).map((it) => `• ${it.name || "—"} x${it.quantity} — ${fmt(it.subtotal)}`).join("\n");

export function buildDocMessage(type, doc, company, extras = {}) {
  const biz = company?.name || "Taller";
  const head = `*${biz}*\n`;

  switch (type) {
    case "order": {
      const items = parseItems(doc.service_items);
      const m = extras.motorcycle;
      const lines = [
        `${head}Orden de Servicio N° ${doc.number || "—"}`,
        `Fecha: ${fmtDate(doc.entry_date || doc.date)}`,
        `Cliente: ${extras.customer?.name || "—"}`,
        `Motocicleta: ${motoLabel(m)}`,
        `Servicio: ${doc.service_type || "—"}`,
        `Estado: ${doc.status || "—"}`,
        "",
        "Detalle de servicios y repuestos:",
        items.length ? listItems(items) : "• Sin items",
        "",
        `Total: ${fmt(doc.cost || items.reduce((s, i) => s + (i.subtotal || 0), 0))}`,
      ];
      return lines.join("\n");
    }
    case "quotation": {
      const items = parseItems(doc.items);
      const lines = [
        `${head}Cotización N° ${doc.number || "—"}`,
        `Fecha: ${fmtDate(doc.date)}`,
        `Cliente: ${extras.customer?.name || doc.customer_name || "—"}`,
        "",
        "Detalle:",
        items.length ? listItems(items) : "• Sin items",
        "",
        `Subtotal: ${fmt(doc.subtotal)}`,
        `IVA: ${fmt(doc.iva)}`,
        `Total: ${fmt(doc.total)}`,
      ];
      return lines.join("\n");
    }
    case "invoice": {
      const items = parseItems(doc.items);
      const lines = [
        `${head}${doc.type || "Factura"} N° ${doc.number || "—"}`,
        `Fecha: ${fmtDate(doc.date)}`,
        `Cliente: ${extras.customer?.name || doc.customer_name || "—"}`,
        `Estado: ${doc.status || "—"}`,
        "",
        "Detalle:",
        items.length ? listItems(items) : (doc.items || "• Sin items"),
        "",
        `Total: ${fmt(doc.total)}`,
      ];
      return lines.join("\n");
    }
    case "purchase": {
      const items = parseItems(doc.items);
      const lines = [
        `${head}Orden de Compra N° ${doc.number || "—"}`,
        `Fecha: ${fmtDate(doc.date)}`,
        `Proveedor: ${extras.supplier?.name || doc.supplier_name || "—"}`,
        "",
        "Detalle:",
        items.length ? listItems(items) : "• Sin items",
        "",
        `Total: ${fmt(doc.total)}`,
      ];
      return lines.join("\n");
    }
    case "loan": {
      const lines = [
        `${head}Comprobante de Préstamo`,
        `Fecha: ${fmtDate(doc.date)}`,
        `Técnico: ${extras.technician?.name || doc.technician_name || "—"}`,
        `Monto: ${fmt(doc.amount)}`,
        `Descontado: ${fmt(doc.deducted_amount)}`,
        `Saldo: ${fmt(doc.balance)}`,
        doc.description ? `Motivo: ${doc.description}` : "",
        `Estado: ${doc.status}`,
      ].filter(Boolean);
      return lines.join("\n");
    }
    case "commission": {
      const orders = extras.orders || [];
      const detail = orders.map((o) => {
        const m = extras.motos?.find((x) => x.id === o.motorcycle_id);
        const comm = o.technician_commission || ((o.cost || 0) * (extras.technician?.commission_percentage || 0) / 100);
        return `• ${fmtDate(o.entry_date || (o.created_date || "").slice(0, 10))} — ${o.service_type || ""} — ${motoLabel(m)} — ${fmt(comm)}`;
      }).join("\n");
      const lines = [
        `${head}Comprobante de Pago de Comisiones`,
        `Técnico: ${extras.technician?.name || doc.technician_name || "—"}`,
        `Período: ${fmtDate(doc.period_start)} a ${fmtDate(doc.period_end)}`,
        `Órdenes: ${doc.orders_count}`,
        "",
        "Detalle (servicios y motos atendidas):",
        detail || "• Sin órdenes",
        "",
        `Total comisiones: ${fmt(doc.total_commission)}`,
        `Descuentos: -${fmt(doc.loans_deducted)}`,
        `Neto a pagar: ${fmt(doc.net_amount)}`,
      ];
      return lines.join("\n");
    }
    default:
      return head + "Documento";
  }
}