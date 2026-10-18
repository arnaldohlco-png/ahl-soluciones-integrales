import React, { useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { momentBogota } from "@/lib/localDate";
import { wrapWhatsApp } from "@/lib/whatsappTemplate";
import { DEFAULT_WARRANTY } from "@/lib/warrantyDefaults";
import PrintToolbar from "@/components/PrintToolbar";
import VerseBox from "@/components/VerseBox";
import AdminSignatureStamp from "@/components/AdminSignatureStamp";

const parse = (s) => { try { return JSON.parse(s || "[]"); } catch { return []; } };

const Section = ({ title, text }) => (
  <div className="mt-4">
    <h3 className="text-xs font-bold uppercase tracking-wide border-b border-slate-300 pb-1 mb-2">{title}</h3>
    <p className="text-xs whitespace-pre-wrap leading-relaxed">{text}</p>
  </div>
);

export default function WarrantyDocument({ order, company, motorcycle, customer, onClose }) {
  const content = useMemo(() => {
    const saved = (() => { try { return JSON.parse(order.warranty_snapshot || "null"); } catch { return null; } })();
    if (saved) return saved;
    return {
      terms: company?.warranty_terms || DEFAULT_WARRANTY.terms,
      coverage: company?.warranty_coverage || DEFAULT_WARRANTY.coverage,
      exclusions: company?.warranty_exclusions || DEFAULT_WARRANTY.exclusions,
      date: momentBogota().format("YYYY-MM-DD"),
    };
  }, [order.id, company?.id]);

  // Guarda una copia de los términos usados en la orden (historial)
  useEffect(() => {
    if (!order.warranty_snapshot) {
      base44.entities.ServiceOrder.update(order.id, { warranty_snapshot: JSON.stringify(content) }).catch(console.error);
    }
  }, [order.id]);

  const items = parse(order.service_items);
  const phone = customer?.whatsapp || customer?.phone;
  const message = wrapWhatsApp({
    name: customer?.name || "",
    intro: `adjuntamos los Términos y Condiciones de Garantía de su orden${order.number ? ` N° ${order.number}` : ""}. Puede ver el documento en PDF aquí: {{link}}`,
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4 print:bg-white print:p-0 print:block">
      <div className="print-area bg-white text-slate-900 w-full max-w-3xl my-4 shadow-xl print:shadow-none print:my-0 print:max-w-none">
        <PrintToolbar onClose={onClose} whatsappPhone={phone} whatsappMessage={message} />
        <div className="p-6 print-inner">
          <div className="doc-header flex items-center justify-between gap-4 border-b-2 border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              {company?.logo && <img src={company.logo} alt="Logo" className="w-16 h-16 object-contain" />}
              <div className="text-xs">
                <p className="font-bold text-base">{company?.name}</p>
                {company?.document_number && <p>NIT/CC: {company.document_number}</p>}
                {company?.phone && <p>Tel: {company.phone}</p>}
                {company?.address && <p>{company.address}{company?.city ? `, ${company.city}` : ""}</p>}
              </div>
            </div>
            <div className="doc-type text-right">
              <p className="font-bold text-sm uppercase">Términos y Condiciones de Garantía</p>
              {order.number && <p className="text-xs">Orden N° {order.number}</p>}
              <p className="text-xs">Fecha: {momentBogota().format("DD/MM/YYYY")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4 text-xs">
            <div>
              <h3 className="font-bold uppercase mb-1">Cliente</h3>
              <p>{customer?.name || "—"}</p>
              {customer?.document_number && <p>{customer.document_type || "Doc"}: {customer.document_number}</p>}
              {(customer?.phone || customer?.whatsapp) && <p>Tel: {customer.whatsapp || customer.phone}</p>}
            </div>
            <div>
              <h3 className="font-bold uppercase mb-1">Motocicleta</h3>
              <p>{[motorcycle?.brand, motorcycle?.line, motorcycle?.model].filter(Boolean).join(" ") || "—"}</p>
              {motorcycle?.plate && <p>Placa: {motorcycle.plate}</p>}
              {order.current_mileage ? <p>Kilometraje: {order.current_mileage}</p> : null}
            </div>
          </div>

          <div className="mt-4 text-xs">
            <h3 className="font-bold uppercase mb-1">Servicio prestado</h3>
            <p>{order.service_type}{order.entry_date ? ` · Ingreso: ${order.entry_date}` : ""}{order.delivery_date ? ` · Entrega: ${order.delivery_date}` : ""}</p>
            {order.work_done && <p className="mt-1 whitespace-pre-wrap">{order.work_done}</p>}
            {items.length > 0 && (
              <ul className="mt-1 list-disc pl-5">
                {items.map((it, i) => <li key={i}>{it.name} x{it.quantity}</li>)}
              </ul>
            )}
          </div>

          <Section title="Términos y condiciones" text={content.terms} />
          <Section title="Cobertura" text={content.coverage} />
          <Section title="Exclusiones" text={content.exclusions} />

          <div className="mt-10 grid grid-cols-2 gap-8 text-xs text-center">
            <div className="border-t border-slate-800 pt-1">Firma del Cliente<br />{customer?.name}</div>
            <div className="border-t border-slate-800 pt-1">Firma del Taller<br />{company?.name}</div>
          </div>
          <AdminSignatureStamp company={company} />
          <VerseBox />
        </div>
      </div>
    </div>
  );
}