import React from "react";
import moment from "moment";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import PrintToolbar from "@/components/PrintToolbar";

const fmt = (n) => "$" + (Number(n) || 0).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function ColombianInvoice({ sale, company, customer, onClose }) {
  const items = (() => { try { return JSON.parse(sale.items || "[]"); } catch { return []; } })();
  const chargesIva = company ? (company.charges_iva ?? (company.document_type === "Persona jurídica")) : true;

  const ivaGroups = {};
  items.forEach((it) => {
    const rate = chargesIva ? (it.iva_rate ?? 19) : 0;
    if (!ivaGroups[rate]) ivaGroups[rate] = { base: 0, iva: 0 };
    ivaGroups[rate].base += it.subtotal || 0;
    ivaGroups[rate].iva += ((it.subtotal || 0) * rate) / 100;
  });
  const ivaRates = Object.keys(ivaGroups).map(Number).sort((a, b) => b - a);

  const whatsappPhone = customer?.whatsapp || customer?.phone;
  const whatsappMessage = `Hola, adjunto su Factura de Venta N° ${sale.number || ""}${company?.name ? " de " + company.name : ""}. Puede ver el documento en PDF aquí: {{link}}`;

  const dt = sale.created_date ? moment(sale.created_date) : moment();
  const resolutionLine = company && company.dian_resolution
    ? `Resolución DIAN N° ${company.dian_resolution}${company.dian_resolution_date ? " del " + moment(company.dian_resolution_date).format("DD/MM/YYYY") : ""}${(company.dian_range_from || company.dian_range_to) ? " · Rango " + (company.dian_range_from || 0) + " al " + (company.dian_range_to || 0) : ""}`
    : "";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4 print:bg-white print:p-0 print:block">
      <div className="print-area bg-white text-slate-900 w-full max-w-3xl my-4 shadow-xl print:shadow-none print:my-0 print:max-w-none">
        <PrintToolbar onClose={onClose} whatsappPhone={whatsappPhone} whatsappMessage={whatsappMessage} />

        {/* Invoice */}
        <div className="p-8 text-[13px] leading-relaxed print:p-6 print-inner">
          {/* Header */}
          <div className="flex flex-col items-center text-center gap-3 border-b-2 border-slate-800 pb-4">
            {company?.logo ? (
              <img src={company.logo} alt="logo" className="w-20 h-20 object-contain" />
            ) : null}
            <div>
              <h1 className="text-xl font-bold uppercase">{company?.name || "Taller"}</h1>
              <p>NIT: {company?.document_number || "—"}</p>
              <p>{company?.document_type === "Persona jurídica" ? "Persona jurídica" : "Persona natural"} · {chargesIva ? "Responsable de IVA" : "No responsable de IVA"}</p>
              <p>{[company?.address, company?.city].filter(Boolean).join(", ")}</p>
              <p>Tel: {company?.phone || "—"}</p>
            </div>
            <div className="border-t border-slate-300 pt-3 w-full">
              <h2 className="text-lg font-bold uppercase">Factura de Venta</h2>
              <p className="font-mono text-base font-bold">{sale.number || "—"}</p>
              <p>Original</p>
            </div>
          </div>

          {/* Resolution */}
          {resolutionLine && (
            <p className="text-center text-xs text-slate-600 py-2 border-b border-slate-200">{resolutionLine}</p>
          )}

          {/* Customer + dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-b border-slate-200">
            <div>
              <p className="font-semibold uppercase text-xs text-slate-500">Facturar a</p>
              <p className="font-medium">{customer?.name || sale.customer_name || "Cliente mostrador"}</p>
              <p>{customer?.document_type ? customer.document_type + ": " : "Doc: "}{customer?.document_number || "—"}</p>
              {customer?.address && <p>{customer.address}</p>}
              {customer?.phone && <p>Tel: {customer.phone}</p>}
            </div>
            <div className="md:text-right">
              <p><span className="text-slate-500">Fecha:</span> {sale.date ? moment(sale.date).format("DD/MM/YYYY") : dt.format("DD/MM/YYYY")}</p>
              <p><span className="text-slate-500">Hora:</span> {dt.format("hh:mm A")}</p>
              <p><span className="text-slate-500">Pago:</span> {sale.payment_type} · {sale.payment_method}</p>
            </div>
          </div>

          {/* Items */}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="text-left py-2 px-2 border border-slate-300">Cant.</th>
                <th className="text-left py-2 px-2 border border-slate-300">Descripción</th>
                <th className="text-right py-2 px-2 border border-slate-300">Vr. Unitario</th>
                <th className="text-center py-2 px-2 border border-slate-300">IVA</th>
                <th className="text-right py-2 px-2 border border-slate-300">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const rate = chargesIva ? (it.iva_rate ?? 19) : 0;
                return (
                  <tr key={i}>
                    <td className="py-1.5 px-2 border border-slate-300 text-center">{it.quantity}</td>
                    <td className="py-1.5 px-2 border border-slate-300">{it.name || "—"}</td>
                    <td className="py-1.5 px-2 border border-slate-300 text-right">{fmt(it.unit_price)}</td>
                    <td className="py-1.5 px-2 border border-slate-300 text-center">{rate}%</td>
                    <td className="py-1.5 px-2 border border-slate-300 text-right">{fmt(it.subtotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mt-3">
            <div className="w-72 text-xs space-y-1 print-totals">
              <div className="flex justify-between"><span>Subtotal</span><span>{fmt(sale.subtotal)}</span></div>
              {ivaRates.map((r) => (
                <div key={r} className="flex justify-between"><span>IVA {r}%</span><span>{fmt(ivaGroups[r].iva)}</span></div>
              ))}
              {!!sale.discount && <div className="flex justify-between"><span>Descuento</span><span>-{fmt(sale.discount)}</span></div>}
              {sale.anticipo > 0 ? (
                <>
                  <div className="flex justify-between"><span>Total</span><span>{fmt((sale.subtotal || 0) + (sale.iva_total || 0) - (sale.discount || 0))}</span></div>
                  <div className="flex justify-between"><span>Anticipo</span><span>-{fmt(sale.anticipo)}</span></div>
                  <div className="flex justify-between font-bold text-sm border-t-2 border-slate-800 pt-1"><span>Saldo a pagar</span><span>{fmt(sale.total)}</span></div>
                </>
              ) : (
                <div className="flex justify-between font-bold text-sm border-t-2 border-slate-800 pt-1"><span>Total</span><span>{fmt(sale.total)}</span></div>
              )}
              {sale.payment_type === "Contado" && sale.amount_paid > 0 && (
                <>
                  <div className="flex justify-between"><span>Recibido</span><span>{fmt(sale.amount_paid)}</span></div>
                  <div className="flex justify-between"><span>Cambio/Vueltas</span><span>{fmt(sale.change)}</span></div>
                </>
              )}
            </div>
          </div>

          {/* Legal footer */}
          <div className="mt-6 pt-3 border-t border-slate-200 text-[11px] text-slate-600 text-center space-y-1">
            {resolutionLine && <p>Esta factura electrónica se expide de acuerdo con la {resolutionLine}.</p>}
            <p>Formato de factura imprimible conforme a la Ley 1231 de 2008 y normativa DIAN vigente.</p>
          </div>
        </div>
      </div>
    </div>
  );
}