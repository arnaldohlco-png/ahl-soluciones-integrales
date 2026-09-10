import React from "react";
import moment from "moment";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import PrintToolbar from "@/components/PrintToolbar";

const fmt = (n) => "$" + (Number(n) || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 });
const fmtDate = (d) => (d ? moment(d).format("DD/MM/YYYY") : "—");
const parseItems = (s) => { try { return JSON.parse(s || "[]"); } catch { return []; } };

const TITLES = {
  order: "Orden de Servicio",
  quotation: "Cotización",
  purchase: "Orden de Compra",
  invoice: null,
  loan: "Comprobante de Préstamo",
  commission: "Comprobante de Pago de Comisiones",
};

export default function PrintableDocument({ type, doc, company, extras = {}, onClose }) {
  if (!doc) return null;
  const title = TITLES[type] || doc.type || "Documento";
  const chargesIva = company ? (company.charges_iva ?? (company.document_type === "Persona jurídica")) : true;
  const moto = extras.motorcycle;
  const customer = extras.customer;
  const supplier = extras.supplier;
  const technician = extras.technician;

  const items = parseItems(type === "order" ? doc.service_items : doc.items);

  const resolutionLine = company && company.dian_resolution
    ? `Resolución DIAN N° ${company.dian_resolution}${company.dian_resolution_date ? " del " + moment(company.dian_resolution_date).format("DD/MM/YYYY") : ""}`
    : "";

  const motoLabel = (m) => (m ? `${m.brand || ""} ${m.model || ""}${m.plate ? ` · Placa: ${m.plate}` : ""}${m.color ? ` · ${m.color}` : ""}` : "—");

  const renderItemsTable = () => (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-slate-100 text-slate-700">
          <th className="text-left py-2 px-2 border border-slate-300">Cant.</th>
          <th className="text-left py-2 px-2 border border-slate-300">Descripción</th>
          <th className="text-right py-2 px-2 border border-slate-300">Vr. Unitario</th>
          <th className="text-right py-2 px-2 border border-slate-300">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <tr><td colSpan={4} className="py-3 px-2 border border-slate-300 text-center text-slate-400">Sin items</td></tr>
        ) : items.map((it, i) => (
          <tr key={i}>
            <td className="py-1.5 px-2 border border-slate-300 text-center">{it.quantity}</td>
            <td className="py-1.5 px-2 border border-slate-300">
              {it.name || "—"}
              {it.type && <span className="ml-2 text-[10px] text-slate-500">[{it.type}]</span>}
            </td>
            <td className="py-1.5 px-2 border border-slate-300 text-right">{fmt(it.unit_price || it.unit_cost)}</td>
            <td className="py-1.5 px-2 border border-slate-300 text-right">{fmt(it.subtotal)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4 print:bg-white print:p-0 print:block">
      <div className="print-area bg-white text-slate-900 w-full max-w-3xl my-4 shadow-xl print:shadow-none print:my-0 print:max-w-none">
        <PrintToolbar onClose={onClose} />

        <div className="p-8 text-[13px] leading-relaxed print:p-6 print-inner">
          {/* Header */}
          <div className="doc-header flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b-2 border-slate-800 pb-4">
            <div className="flex items-start gap-3">
              {company?.logo ? <img src={company.logo} alt="logo" className="w-16 h-16 object-contain flex-shrink-0" /> : null}
              <div className="text-left">
                <h1 className="text-xl font-bold uppercase">{company?.name || "Taller"}</h1>
                <p>NIT: {company?.document_number || "—"}</p>
                <p>{company?.document_type === "Persona jurídica" ? "Persona jurídica" : "Persona natural"} · {chargesIva ? "Responsable de IVA" : "No responsable de IVA"}</p>
                <p>{[company?.address, company?.city].filter(Boolean).join(", ")}</p>
                <p>Tel: {company?.phone || "—"}</p>
              </div>
            </div>
            <div className="doc-type sm:text-right sm:border-l sm:border-slate-300 sm:pl-4">
              <h2 className="text-lg font-bold uppercase">{title}</h2>
              <p className="font-mono text-base font-bold">{doc.number || "—"}</p>
              <p>Fecha: {fmtDate(doc.date || doc.entry_date)}</p>
            </div>
          </div>

          {resolutionLine && (type === "invoice" || type === "quotation") && (
            <p className="text-left text-xs text-slate-600 py-2 border-b border-slate-200">{resolutionLine}</p>
          )}

          {/* Parties */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-b border-slate-200">
            <div>
              {type === "order" && (
                <>
                  <p className="font-semibold uppercase text-xs text-slate-500">Cliente</p>
                  <p className="font-medium">{customer?.name || customer?.name || "—"}</p>
                  {customer?.document_number && <p>Doc: {customer.document_number}</p>}
                  {customer?.phone && <p>Tel: {customer.phone}</p>}
                  <p className="font-semibold uppercase text-xs text-slate-500 mt-2">Motocicleta</p>
                  <p className="font-medium">{motoLabel(moto)}</p>
                  {moto?.vin && <p>VIN: {moto.vin}</p>}
                  {doc.current_mileage ? <p>Km: {Number(doc.current_mileage).toLocaleString("es-CO")}</p> : null}
                </>
              )}
              {(type === "quotation" || type === "invoice") && (
                <>
                  <p className="font-semibold uppercase text-xs text-slate-500">Cliente</p>
                  <p className="font-medium">{customer?.name || doc.customer_name || "—"}</p>
                  {customer?.document_number && <p>Doc: {customer.document_number}</p>}
                  {customer?.phone && <p>Tel: {customer.phone}</p>}
                </>
              )}
              {type === "purchase" && (
                <>
                  <p className="font-semibold uppercase text-xs text-slate-500">Proveedor</p>
                  <p className="font-medium">{supplier?.name || doc.supplier_name || "—"}</p>
                  {supplier?.document_number && <p>NIT: {supplier.document_number}</p>}
                  {supplier?.phone && <p>Tel: {supplier.phone}</p>}
                </>
              )}
              {(type === "loan" || type === "commission") && (
                <>
                  <p className="font-semibold uppercase text-xs text-slate-500">Técnico</p>
                  <p className="font-medium">{technician?.name || doc.technician_name || "—"}</p>
                  {technician?.document_number && <p>Doc: {technician.document_number}</p>}
                  {technician?.phone && <p>Tel: {technician.phone}</p>}
                </>
              )}
            </div>
            <div className="md:text-right">
              {type === "order" && (
                <>
                  <p><span className="text-slate-500">Estado:</span> {doc.status}</p>
                  <p><span className="text-slate-500">Servicio:</span> {doc.service_type}</p>
                  {doc.technician_id && <p><span className="text-slate-500">Técnico:</span> {technician?.name || doc.technician_id}</p>}
                  {doc.entry_date && <p><span className="text-slate-500">Ingreso:</span> {fmtDate(doc.entry_date)}</p>}
                  {doc.delivery_date && <p><span className="text-slate-500">Entrega:</span> {fmtDate(doc.delivery_date)}</p>}
                </>
              )}
              {type === "purchase" && (
                <>
                  {doc.invoice_number && <p><span className="text-slate-500">Factura proveedor:</span> {doc.invoice_number}</p>}
                  <p><span className="text-slate-500">Pago:</span> {doc.payment_type} · {doc.payment_method}</p>
                  <p><span className="text-slate-500">Estado:</span> {doc.status}</p>
                </>
              )}
              {(type === "quotation" || type === "invoice") && (
                <>
                  <p><span className="text-slate-500">Estado:</span> {doc.status}</p>
                  {doc.payment_terms && <p><span className="text-slate-500">Pago:</span> {doc.payment_terms}</p>}
                  {doc.payment_due_date && <p><span className="text-slate-500">Vence:</span> {fmtDate(doc.payment_due_date)}</p>}
                </>
              )}
              {type === "loan" && (
                <>
                  <p><span className="text-slate-500">Monto:</span> {fmt(doc.amount)}</p>
                  <p><span className="text-slate-500">Descontado:</span> {fmt(doc.deducted_amount)}</p>
                  <p><span className="text-slate-500">Saldo:</span> {fmt(doc.balance)}</p>
                  <p><span className="text-slate-500">Estado:</span> {doc.status}</p>
                </>
              )}
              {type === "commission" && (
                <>
                  <p><span className="text-slate-500">Período:</span> {fmtDate(doc.period_start)} - {fmtDate(doc.period_end)}</p>
                  <p><span className="text-slate-500">Órdenes:</span> {doc.orders_count}</p>
                  <p><span className="text-slate-500">Estado:</span> {doc.status}</p>
                </>
              )}
            </div>
          </div>

          {/* Items / detail */}
          {type === "order" && (
            <div className="py-4">
              <p className="font-semibold uppercase text-xs text-slate-500 mb-2">Servicios y repuestos</p>
              {renderItemsTable()}
              {doc.description && <p className="mt-2 text-slate-600">Descripción: {doc.description}</p>}
              {doc.work_done && <p className="mt-1 text-slate-600">Trabajo realizado: {doc.work_done}</p>}
            </div>
          )}

          {(type === "quotation" || type === "invoice" || type === "purchase") && (
            <div className="py-4">{renderItemsTable()}</div>
          )}

          {type === "loan" && doc.description && (
            <div className="py-4">
              <p className="font-semibold uppercase text-xs text-slate-500 mb-1">Descripción / Motivo</p>
              <p className="text-slate-700">{doc.description}</p>
            </div>
          )}

          {type === "commission" && (
            <div className="py-4">
              <p className="font-semibold uppercase text-xs text-slate-500 mb-2">Detalle de órdenes (servicios y motos atendidas)</p>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="text-left py-2 px-2 border border-slate-300">Fecha</th>
                    <th className="text-left py-2 px-2 border border-slate-300">Servicio</th>
                    <th className="text-left py-2 px-2 border border-slate-300">Motocicleta</th>
                    <th className="text-right py-2 px-2 border border-slate-300">Comisión</th>
                  </tr>
                </thead>
                <tbody>
                  {(extras.orders || []).map((o) => {
                    const m = extras.motos?.find((x) => x.id === o.motorcycle_id);
                    const comm = o.technician_commission || ((o.cost || 0) * (technician?.commission_percentage || 0) / 100);
                    return (
                      <tr key={o.id}>
                        <td className="py-1.5 px-2 border border-slate-300">{fmtDate(o.entry_date || (o.created_date || "").slice(0, 10))}</td>
                        <td className="py-1.5 px-2 border border-slate-300">{o.service_type || "—"}</td>
                        <td className="py-1.5 px-2 border border-slate-300">{motoLabel(m)}</td>
                        <td className="py-1.5 px-2 border border-slate-300 text-right">{fmt(comm)}</td>
                      </tr>
                    );
                  })}
                  {(extras.orders || []).length === 0 && (
                    <tr><td colSpan={4} className="py-2 px-2 border border-slate-300 text-center text-slate-400">Sin órdenes</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div className="flex justify-end mt-3">
            <div className="w-72 text-xs space-y-1 print-totals">
              {type === "order" && (
                <>
                  <div className="flex justify-between"><span>Subtotal</span><span>{fmt(items.reduce((s, i) => s + (i.subtotal || 0), 0))}</span></div>
                  <div className="flex justify-between font-bold text-sm border-t-2 border-slate-800 pt-1"><span>Total</span><span>{fmt(doc.cost || items.reduce((s, i) => s + (i.subtotal || 0), 0))}</span></div>
                </>
              )}
              {(type === "quotation" || type === "invoice") && (
                <>
                  <div className="flex justify-between"><span>Subtotal</span><span>{fmt(doc.subtotal)}</span></div>
                  {!!Number(doc.iva) && <div className="flex justify-between"><span>IVA</span><span>{fmt(doc.iva)}</span></div>}
                  {!!Number(doc.discount) && <div className="flex justify-between"><span>Descuento</span><span>-{fmt(doc.discount)}</span></div>}
                  <div className="flex justify-between font-bold text-sm border-t-2 border-slate-800 pt-1"><span>Total</span><span>{fmt(doc.total)}</span></div>
                </>
              )}
              {type === "purchase" && (
                <>
                  <div className="flex justify-between"><span>Subtotal</span><span>{fmt(doc.subtotal)}</span></div>
                  {!!Number(doc.iva_total) && <div className="flex justify-between"><span>IVA</span><span>{fmt(doc.iva_total)}</span></div>}
                  {!!Number(doc.transport_cost) && <div className="flex justify-between"><span>Transporte</span><span>{fmt(doc.transport_cost)}</span></div>}
                  {!!Number(doc.discount) && <div className="flex justify-between"><span>Descuento</span><span>-{fmt(doc.discount)}</span></div>}
                  <div className="flex justify-between font-bold text-sm border-t-2 border-slate-800 pt-1"><span>Total</span><span>{fmt(doc.total)}</span></div>
                </>
              )}
              {type === "loan" && (
                <div className="flex justify-between font-bold text-sm border-t-2 border-slate-800 pt-1"><span>Saldo pendente</span><span>{fmt(doc.balance)}</span></div>
              )}
              {type === "commission" && (
                <>
                  <div className="flex justify-between"><span>Total comisiones</span><span>{fmt(doc.total_commission)}</span></div>
                  <div className="flex justify-between"><span>Descuentos</span><span>-{fmt(doc.loans_deducted)}</span></div>
                  <div className="flex justify-between font-bold text-sm border-t-2 border-slate-800 pt-1"><span>Neto a pagar</span><span>{fmt(doc.net_amount)}</span></div>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-3 border-t border-slate-200 text-[11px] text-slate-600 text-center space-y-1">
            {company?.footer_text && <p className="whitespace-pre-wrap">{company.footer_text}</p>}
            <p>Documento generado el {moment().format("DD/MM/YYYY")}.</p>
          </div>
        </div>
      </div>
    </div>
  );
}