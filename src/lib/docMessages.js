import moment from "moment";
import { wrapWhatsApp } from "@/lib/whatsappTemplate";

const fmt = (n) => `$${(Number(n) || 0).toLocaleString("es-CO")}`;
const fmtDate = (d) => (d ? moment(d).format("DD/MM/YYYY") : "—");
const parseItems = (s) => { try { return JSON.parse(s || "[]"); } catch { return []; } };

const motoLabel = (m) => (m ? `${m.brand || ""} ${m.model || ""}${m.plate ? ` (Placa: ${m.plate})` : ""}` : "");

const listItems = (items) =>
  (items || []).map((it) => `• ${it.name || "—"} x${it.quantity} — ${fmt(it.subtotal)}`).join("\n");

export function buildDocMessage(type, doc, company, extras = {}) {
  switch (type) {
    case "order": {
      const items = parseItems(doc.service_items);
      const m = extras.motorcycle;
      const name = extras.customer?.name || "—";
      const total = doc.cost || items.reduce((s, i) => s + (i.subtotal || 0), 0);
      const intro = `su motocicleta ${motoLabel(m)} ingresó para ${doc.service_type || "servicio"}${doc.number ? ` (Orden N° ${doc.number})` : ""}.`;
      const body = [
        "Detalle de servicios y repuestos:",
        items.length ? listItems(items) : "• Sin items",
        `Total: ${fmt(total)}`,
      ].join("\n");
      return wrapWhatsApp({ name, intro, body, status: doc.status, statusLabel: "Estado del servicio" });
    }
    case "quotation": {
      const items = parseItems(doc.items);
      const name = extras.customer?.name || doc.customer_name || "—";
      const intro = `hemos preparado la Cotización N° ${doc.number || "—"} para usted.`;
      const body = [
        "Detalle:",
        items.length ? listItems(items) : "• Sin items",
        `Subtotal: ${fmt(doc.subtotal)}`,
        `IVA: ${fmt(doc.iva)}`,
        `Total: ${fmt(doc.total)}`,
      ].join("\n");
      return wrapWhatsApp({ name, intro, body, status: doc.status, statusLabel: "Estado" });
    }
    case "invoice": {
      const items = parseItems(doc.items);
      const name = extras.customer?.name || doc.customer_name || "—";
      const intro = `adjuntamos la ${doc.type || "Factura"} N° ${doc.number || "—"}.`;
      const body = [
        "Detalle:",
        items.length ? listItems(items) : (doc.items || "• Sin items"),
        `Total: ${fmt(doc.total)}`,
      ].join("\n");
      return wrapWhatsApp({ name, intro, body, status: doc.status, statusLabel: "Estado" });
    }
    case "purchase": {
      const items = parseItems(doc.items);
      const name = extras.supplier?.name || doc.supplier_name || "—";
      const intro = `registramos la Orden de Compra N° ${doc.number || "—"}.`;
      const body = [
        "Detalle:",
        items.length ? listItems(items) : "• Sin items",
        `Total: ${fmt(doc.total)}`,
      ].join("\n");
      return wrapWhatsApp({ name, intro, body, status: doc.status, statusLabel: "Estado" });
    }
    case "loan": {
      const name = extras.technician?.name || doc.technician_name || "—";
      const intro = `se ha registrado un comprobante de préstamo a su favor.`;
      const body = [
        `Fecha: ${fmtDate(doc.date)}`,
        `Monto: ${fmt(doc.amount)}`,
        `Descontado: ${fmt(doc.deducted_amount)}`,
        `Saldo: ${fmt(doc.balance)}`,
        doc.description ? `Motivo: ${doc.description}` : "",
      ].filter(Boolean).join("\n");
      return wrapWhatsApp({ name, intro, body, status: doc.status, statusLabel: "Estado" });
    }
    case "commission": {
      const orders = extras.orders || [];
      const detail = orders.map((o) => {
        const m = extras.motos?.find((x) => x.id === o.motorcycle_id);
        const comm = o.technician_commission || ((o.cost || 0) * (extras.technician?.commission_percentage || 0) / 100);
        return `• ${fmtDate(o.entry_date || (o.created_date || "").slice(0, 10))} — ${o.service_type || ""} — ${motoLabel(m)} — ${fmt(comm)}`;
      }).join("\n");
      const name = extras.technician?.name || doc.technician_name || "—";
      const intro = `se ha generado el comprobante de pago de comisiones del período ${fmtDate(doc.period_start)} a ${fmtDate(doc.period_end)}.`;
      const body = [
        `Órdenes: ${doc.orders_count}`,
        "",
        "Detalle (servicios y motos atendidas):",
        detail || "• Sin órdenes",
        "",
        `Total comisiones: ${fmt(doc.total_commission)}`,
        `Descuentos: -${fmt(doc.loans_deducted)}`,
        `Neto a pagar: ${fmt(doc.net_amount)}`,
      ].join("\n");
      return wrapWhatsApp({ name, intro, body, status: doc.status, statusLabel: "Estado" });
    }
    default:
      return wrapWhatsApp({ intro: "no hay detalle disponible." });
  }
}