import React from "react";
import VerseBox from "@/components/VerseBox";
import { fmtBogota } from "@/lib/localDate";
import PrintToolbar from "@/components/PrintToolbar";
import { parseAnticipos, sumAnticipos } from "@/lib/anticipos";

const fmt = (n) => "$" + (Number(n) || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 });

export default function AnticipoReceipt({ order, company, customer, motorcycle, onClose }) {
  if (!order) return null;
  const pagos = parseAnticipos(order.anticipos).filter((a) => Number(a?.amount) > 0);
  const total = sumAnticipos(order.anticipos);
  const costo = Number(order.cost) || 0;
  const saldo = Math.max(0, costo - total);
  const number = `RC-${order.number || String(order.id).slice(-6)}`;
  const phone = customer?.whatsapp || customer?.phone;
  const message = `Hola${customer?.name ? " " + customer.name : ""}, adjunto su recibo de caja N° ${number} por anticipos de la orden ${order.number || ""}${company?.name ? " de " + company.name : ""}. Total recibido: ${fmt(total)}. Puede ver el PDF aquí: {{link}}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4 print:bg-white print:p-0 print:block">
      <div className="print-area bg-white text-slate-900 w-full max-w-3xl my-4 shadow-xl print:shadow-none print:my-0 print:max-w-none">
        <PrintToolbar onClose={onClose} whatsappPhone={phone} whatsappMessage={message} />
        <div className="p-8 text-[13px] leading-relaxed print:p-6 print-inner">
          <div className="doc-header flex flex-col items-center text-center gap-2 border-b-2 border-slate-800 pb-4">
            {company?.logo && <img src={company.logo} alt="logo" className="w-16 h-16 object-contain" />}
            <div>
              <p className="font-bold text-base uppercase">{company?.name}</p>
              {company?.document_number && <p className="text-xs">NIT/C.C.: {company.document_number}</p>}
              <p className="text-xs text-slate-600">{[company?.address, company?.city, company?.phone].filter(Boolean).join(" · ")}</p>
            </div>
            <div className="doc-type w-full border-t border-slate-300 pt-2">
              <p className="font-bold text-lg uppercase">Recibo de caja - Anticipos</p>
              <p className="text-xs">N° {number} · {fmtBogota(new Date(), "DD/MM/YYYY")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
            <div>
              <p className="font-semibold text-slate-500 uppercase text-[10px]">Recibido de</p>
              <p className="font-medium">{customer?.name || "—"}</p>
              {customer?.document_number && <p>CC/NIT: {customer.document_number}</p>}
              {phone && <p>Tel: {phone}</p>}
            </div>
            <div>
              <p className="font-semibold text-slate-500 uppercase text-[10px]">Orden de servicio</p>
              <p className="font-medium">N° {order.number || "—"}</p>
              <p>{motorcycle ? `${motorcycle.brand || ""} ${motorcycle.model || ""}${motorcycle.plate ? " · " + motorcycle.plate : ""}` : "—"}</p>
            </div>
          </div>

          <table className="w-full text-xs border-collapse mt-4">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="text-left py-2 px-2 border border-slate-300">#</th>
                <th className="text-left py-2 px-2 border border-slate-300">Fecha</th>
                <th className="text-left py-2 px-2 border border-slate-300">Medio de pago</th>
                <th className="text-right py-2 px-2 border border-slate-300">Valor</th>
              </tr>
            </thead>
            <tbody>
              {pagos.length === 0 ? (
                <tr><td colSpan={4} className="py-3 px-2 border border-slate-300 text-center text-slate-400">Sin anticipos registrados</td></tr>
              ) : pagos.map((a, i) => (
                <tr key={i}>
                  <td className="py-1.5 px-2 border border-slate-300">{i + 1}</td>
                  <td className="py-1.5 px-2 border border-slate-300">{a.date ? fmtBogota(a.date, "DD/MM/YYYY") : "—"}</td>
                  <td className="py-1.5 px-2 border border-slate-300">{a.method || "—"}</td>
                  <td className="py-1.5 px-2 border border-slate-300 text-right">{fmt(a.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mt-3">
            <div className="w-72 text-xs space-y-1 print-totals">
              <div className="flex justify-between font-bold text-sm border-t-2 border-slate-800 pt-1"><span>Total anticipos</span><span>{fmt(total)}</span></div>
              {costo > 0 && <div className="flex justify-between"><span>Valor de la orden</span><span>{fmt(costo)}</span></div>}
              {costo > 0 && <div className="flex justify-between font-semibold"><span>Saldo pendiente</span><span>{fmt(saldo)}</span></div>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 mt-16 text-center text-xs">
            <div className="border-t border-slate-400 pt-1">Recibí conforme (Empresa)</div>
            <div className="border-t border-slate-400 pt-1">Cliente</div>
          </div>
          <VerseBox />
        </div>
      </div>
    </div>
  );
}