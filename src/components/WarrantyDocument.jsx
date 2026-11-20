import React, { useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { momentBogota, fmtBogota } from "@/lib/localDate";
import { wrapWhatsApp } from "@/lib/whatsappTemplate";
import { DEFAULT_WARRANTY } from "@/lib/warrantyDefaults";
import { parseAnticipos, sumAnticipos } from "@/lib/anticipos";
import PrintToolbar from "@/components/PrintToolbar";
import VerseBox from "@/components/VerseBox";
import AdminSignatureStamp from "@/components/AdminSignatureStamp";

const parse = (s) => { try { return JSON.parse(s || "[]"); } catch { return []; } };
const fmt = (n) => "$" + (Number(n) || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 });
const fmtDate = (d) => fmtBogota(d, "DD/MM/YYYY");

const Section = ({ title, text }) => (
  <div className="mt-4">
    <h3 className="text-xs font-bold uppercase tracking-wide border-b border-slate-300 pb-1 mb-2">{title}</h3>
    <p className="text-xs whitespace-pre-wrap leading-relaxed">{text}</p>
  </div>
);

const Field = ({ label, value }) =>
  value ? (
    <p className="text-xs"><span className="font-medium text-slate-500">{label}:</span> {value}</p>
  ) : null;

export default function WarrantyDocument({ order, company, motorcycle, customer, technician, onClose }) {
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
  const faults = parse(order.fault_checklist).filter((f) => f.text);
  const anticipos = parseAnticipos(order.anticipos);
  const anticipoTotal = sumAnticipos(order.anticipos);
  const itemsTotal = items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
  const total = Number(order.cost) || itemsTotal;
  const phone = customer?.whatsapp || customer?.phone;
  const message = wrapWhatsApp({
    name: customer?.name || "",
    intro: `adjuntamos el comprobante completo de su orden${order.number ? ` N° ${order.number}` : ""} junto con los Términos y Condiciones de Garantía. Puede ver el documento en PDF aquí: {{link}}`,
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
              <p className="font-bold text-sm uppercase">Comprobante de Orden y Garantía</p>
              {order.number && <p className="font-mono text-sm font-bold">N° {order.number}</p>}
              <p className="text-xs">Fecha: {momentBogota().format("DD/MM/YYYY")}</p>
              {order.status && <p className="text-xs">Estado: {order.status}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <h3 className="text-xs font-bold uppercase mb-1">Cliente</h3>
              <p className="text-xs">{customer?.name || "—"}</p>
              {customer?.document_number && <p className="text-xs">{customer.document_type || "Doc"}: {customer.document_number}</p>}
              {(customer?.phone || customer?.whatsapp) && <p className="text-xs">Tel: {customer.whatsapp || customer.phone}</p>}
              {customer?.address && <p className="text-xs">{customer.address}</p>}
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase mb-1">Motocicleta</h3>
              <p className="text-xs">{[motorcycle?.brand, motorcycle?.line, motorcycle?.model].filter(Boolean).join(" ") || "—"}</p>
              {motorcycle?.plate && <p className="text-xs">Placa: {motorcycle.plate}</p>}
              {motorcycle?.color && <p className="text-xs">Color: {motorcycle.color}</p>}
              {motorcycle?.vin && <p className="text-xs">VIN: {motorcycle.vin}</p>}
              {order.current_mileage ? <p className="text-xs">Kilometraje: {Number(order.current_mileage).toLocaleString("es-CO")}</p> : null}
            </div>
          </div>

          <div className="mt-4 border-t border-slate-200 pt-3">
            <h3 className="text-xs font-bold uppercase mb-1">Datos del servicio</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <Field label="Tipo de servicio" value={order.service_type} />
              <Field label="Técnico" value={technician?.name || order.mechanic} />
              <Field label="Ingreso" value={order.entry_date ? `${fmtDate(order.entry_date)}${order.entry_time ? ` ${order.entry_time}` : ""}` : ""} />
              <Field label="Entrega" value={order.delivery_date ? fmtDate(order.delivery_date) : ""} />
              <Field label="Combustible" value={order.fuel_level} />
              <Field label="Estado visual" value={order.visual_condition} />
              <Field label="Accesorios" value={order.accessories} />
              <Field label="Km próximo aceite" value={order.next_oil_change ? Number(order.next_oil_change).toLocaleString("es-CO") : ""} />
            </div>
          </div>

          {(order.description || order.customer_complaint || order.reported_fault || order.technical_diagnosis || order.work_done || faults.length > 0) && (
            <div className="mt-4 border-t border-slate-200 pt-3 space-y-1">
              <h3 className="text-xs font-bold uppercase mb-1">Diagnóstico y trabajo realizado</h3>
              <Field label="Descripción del trabajo" value={order.description} />
              <Field label="Queja del cliente" value={order.customer_complaint} />
              <Field label="Falla reportada" value={order.reported_fault} />
              <Field label="Diagnóstico técnico" value={order.technical_diagnosis} />
              <Field label="Trabajo realizado" value={order.work_done} />
              <Field label="Pruebas realizadas" value={order.tests_performed} />
              <Field label="Recomendaciones" value={order.recommendations} />
              {faults.length > 0 && (
                <div className="pt-1">
                  <p className="text-xs font-medium text-slate-500">Fallas reportadas</p>
                  <ul className="text-xs list-disc pl-5">
                    {faults.map((f, i) => <li key={f.id || i}>{f.text}{f.solved ? " (solucionada)" : ""}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 border-t border-slate-200 pt-3">
            <h3 className="text-xs font-bold uppercase mb-2">Servicios y repuestos</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="text-left py-1.5 px-2 border border-slate-300">Cant.</th>
                  <th className="text-left py-1.5 px-2 border border-slate-300">Descripción</th>
                  <th className="text-right py-1.5 px-2 border border-slate-300">Vr. unitario</th>
                  <th className="text-right py-1.5 px-2 border border-slate-300">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={4} className="py-2 px-2 border border-slate-300 text-center text-slate-400">Sin ítems</td></tr>
                ) : items.map((it, i) => (
                  <tr key={i}>
                    <td className="py-1 px-2 border border-slate-300 text-center">{it.quantity}</td>
                    <td className="py-1 px-2 border border-slate-300">{it.name}</td>
                    <td className="py-1 px-2 border border-slate-300 text-right">{fmt(it.unit_price)}</td>
                    <td className="py-1 px-2 border border-slate-300 text-right">{fmt(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end mt-2">
              <div className="w-64 text-xs space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>{fmt(itemsTotal)}</span></div>
                <div className="flex justify-between font-bold border-t border-slate-800 pt-1"><span>Total</span><span>{fmt(total)}</span></div>
                {anticipoTotal > 0 && (
                  <>
                    <div className="flex justify-between"><span>Anticipos</span><span>-{fmt(anticipoTotal)}</span></div>
                    <div className="flex justify-between font-bold border-t border-slate-800 pt-1"><span>Saldo</span><span>{fmt(Math.max(0, total - anticipoTotal))}</span></div>
                  </>
                )}
              </div>
            </div>
            {anticipos.length > 0 && (
              <div className="mt-2 text-xs">
                <p className="font-medium text-slate-500">Detalle de anticipos</p>
                <ul className="space-y-0.5">
                  {anticipos.map((a, i) => (
                    <li key={i} className="flex justify-between"><span>{fmtDate(a.date)} · {a.method || "Efectivo"}</span><span>{fmt(a.amount)}</span></li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <Section title="Términos y condiciones" text={content.terms} />
          <Section title="Cobertura" text={content.coverage} />
          <Section title="Exclusiones" text={content.exclusions} />

          <div className="mt-10 grid grid-cols-2 gap-8 text-xs text-center">
            <div className="border-t border-slate-800 pt-1">Firma del Cliente<br />{customer?.name}</div>
            <div className="border-t border-slate-800 pt-1">Firma del Taller<br />{company?.name}</div>
          </div>

          {company?.warranty_footer_text && (
            <div className="mt-4 pt-2 border-t border-slate-200 text-[11px] text-slate-600 text-center whitespace-pre-wrap">
              {company.warranty_footer_text}
            </div>
          )}

          <AdminSignatureStamp company={company} />
          <VerseBox />
        </div>
      </div>
    </div>
  );
}