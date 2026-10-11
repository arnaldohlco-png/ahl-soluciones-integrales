import React from "react";
import moment from "moment";
import { momentBogota, fmtBogota } from "@/lib/localDate";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import PrintToolbar from "@/components/PrintToolbar";
import { Image } from "@/components/ui/image";
import { parseAnticipos, sumAnticipos } from "@/lib/anticipos";

const fmt = (n) => "$" + (Number(n) || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 });
const fmtDate = (d) => fmtBogota(d, "DD/MM/YYYY");
const parseItems = (s) => { try { return JSON.parse(s || "[]"); } catch { return []; } };
const parsePhotos = (s) => { try { const v = JSON.parse(s || "[]"); return Array.isArray(v) ? v.filter(Boolean) : []; } catch { return []; } };
const has = (v) => v != null && String(v).trim() !== "" && !(typeof v === "number" && isNaN(v));
const hasNum = (v) => has(v) && Number(v) > 0;

// Base de comisión: solo servicios (type "Servicio"), excluyendo los de categoría "Terceros"
const isTerceroItem = (i, services) => {
  if (i.service_id && services) {
    const svc = services.find((s) => s.id === i.service_id);
    if (svc && String(svc.category || "").toLowerCase() === "terceros") return true;
  }
  return /tercero/i.test((i.name || "").trim());
};
const commissionBase = (o, services) => {
  const items = parseItems(o.service_items);
  return items
    .filter((i) => String(i.type || "").toLowerCase() === "servicio")
    .filter((i) => !isTerceroItem(i, services))
    .reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
};
const serviceConcept = (o) => {
  const items = parseItems(o.service_items)
    .filter((i) => String(i.type || "").toLowerCase() === "servicio")
    .filter((i) => !/tercero/i.test((i.name || "").trim()));
  return items.map((i) => i.name).filter(Boolean).join(", ") || o.service_type || "—";
};

const TITLES = {
  order: "Orden de Servicio",
  quotation: "Cotización",
  purchase: "Orden de Compra",
  invoice: null,
  loan: "Comprobante de Préstamo",
  commission: "Comprobante de Pago de Comisiones",
  supplier_order: "Pedido a Proveedor",
};

const SignatureBlock = ({ label, img, name, docId }) => (
  <div className="text-center">
    {img ? <img src={img} alt={label} className="h-16 mx-auto object-contain" /> : <div className="h-16" />}
    <div className="border-t border-slate-400 mt-1 pt-1">
      <p className="text-xs font-semibold text-slate-700">{label}</p>
      {(name || docId) && (
        <p className="text-[11px] text-slate-500">{name}{name && docId ? " · " : ""}{docId ? `CC/NIT: ${docId}` : ""}</p>
      )}
    </div>
  </div>
);

export default function PrintableDocument({ type, doc, company, extras = {}, onClose }) {
  if (!doc) return null;
  const title = TITLES[type] || doc.type || "Documento";
  const chargesIva = company ? (company.charges_iva ?? (company.document_type === "Persona jurídica")) : true;
  const moto = extras.motorcycle;
  const customer = extras.customer;
  const supplier = extras.supplier;
  const technician = extras.technician;

  const items = parseItems(type === "order" ? doc.service_items : doc.items);

  // Desglose de comisiones recalculado desde las órdenes (base = solo servicios)
  const commBreakdown = type === "commission"
    ? (extras.orders || []).map((o) => {
        const base = commissionBase(o, extras.services);
        const pct = technician?.commission_percentage || 0;
        return { order: o, base, commission: base * pct / 100, concept: serviceConcept(o) };
      })
    : [];
  const commTotal = commBreakdown.reduce((s, b) => s + b.commission, 0);
  const commNet = commTotal - (Number(doc.loans_deducted) || 0);

  const whatsappPhone =
    type === "purchase" ? supplier?.phone
    : (type === "loan" || type === "commission") ? technician?.phone
    : (customer?.whatsapp || customer?.phone);
  const whatsappMessage = `Hola, adjunto su ${title} N° ${doc.number || ""}${company?.name ? " de " + company.name : ""}. Puede ver el documento en PDF aquí: {{link}}`;

  const resolutionLine = company && company.dian_resolution
    ? `Resolución DIAN N° ${company.dian_resolution}${company.dian_resolution_date ? " del " + moment(company.dian_resolution_date).format("DD/MM/YYYY") : ""}`
    : "";

  const motoLabel = (m) => (m ? `${m.brand || ""} ${m.model || ""}${m.plate ? ` · Placa: ${m.plate}` : ""}${m.color ? ` · ${m.color}` : ""}` : "—");

  const renderItemsTable = () => (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-slate-100 text-slate-700">
          <th className="text-left py-2 px-2 border border-slate-300">Cant.</th>
          <th className="text-left py-2 px-2 border border-slate-300">SKU</th>
          <th className="text-left py-2 px-2 border border-slate-300">Descripción</th>
          <th className="text-right py-2 px-2 border border-slate-300">Vr. Unitario</th>
          <th className="text-right py-2 px-2 border border-slate-300">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <tr><td colSpan={5} className="py-3 px-2 border border-slate-300 text-center text-slate-400">Sin items</td></tr>
        ) : items.map((it, i) => (
          <tr key={i}>
            <td className="py-1.5 px-2 border border-slate-300 text-center">{it.quantity}</td>
            <td className="py-1.5 px-2 border border-slate-300 font-mono text-[11px] text-slate-600">{it.sku || "—"}</td>
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
        <PrintToolbar onClose={onClose} whatsappPhone={whatsappPhone} whatsappMessage={whatsappMessage} />

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
                  {doc.entry_date && <p><span className="text-slate-500">Ingreso:</span> {fmtDate(doc.entry_date)}{has(doc.entry_time) ? ` ${doc.entry_time}` : ""}</p>}
                  {doc.delivery_date && <p><span className="text-slate-500">Entrega:</span> {fmtDate(doc.delivery_date)}</p>}
                  {has(doc.fuel_level) && <p><span className="text-slate-500">Combustible:</span> {doc.fuel_level}</p>}
                  {has(doc.visual_condition) && <p><span className="text-slate-500">Estado visual:</span> {doc.visual_condition}</p>}
                  {has(doc.accessories) && <p><span className="text-slate-500">Accesorios:</span> {doc.accessories}</p>}
                </>
              )}
              {type === "purchase" && (
                <>
                  {doc.invoice_number && <p><span className="text-slate-500">Factura proveedor:</span> {doc.invoice_number}</p>}
                  <p><span className="text-slate-500">Pago:</span> {doc.payment_type} · {doc.payment_method}</p>
                  <p><span className="text-slate-500">Estado:</span> {doc.status}</p>
                </>
              )}
              {type === "supplier_order" && (
                <>
                  <p><span className="text-slate-500">Estado:</span> {doc.status}</p>
                  {doc.notes && <p><span className="text-slate-500">Notas:</span> {doc.notes}</p>}
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

              {parseAnticipos(doc.anticipos).length > 0 && (
                <div className="mt-3 border-t border-slate-200 pt-3">
                  <p className="font-semibold uppercase text-xs text-slate-500 mb-1">Anticipos</p>
                  <ul className="text-slate-700 space-y-0.5">
                    {parseAnticipos(doc.anticipos).map((a, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{fmtDate(a.date)} · {a.method || "Efectivo"}</span>
                        <span className="font-medium">{fmt(a.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {[
                ["Queja del cliente", doc.customer_complaint],
                ["Falla reportada", doc.reported_fault],
                ["Diagnóstico técnico", doc.technical_diagnosis],
                ["Pruebas realizadas", doc.tests_performed],
                ["Recomendaciones", doc.recommendations],
              ].some(([, v]) => v && String(v).trim()) && (
                <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                  <p className="font-semibold uppercase text-xs text-slate-500">Diagnóstico</p>
                  {[
                    ["Queja del cliente", doc.customer_complaint],
                    ["Falla reportada", doc.reported_fault],
                    ["Diagnóstico técnico", doc.technical_diagnosis],
                    ["Pruebas realizadas", doc.tests_performed],
                    ["Recomendaciones", doc.recommendations],
                  ].map(([label, val]) =>
                    val && String(val).trim() ? (
                      <p key={label} className="text-slate-700">
                        <span className="font-medium text-slate-500">{label}:</span> {val}
                      </p>
                    ) : null
                  )}
                </div>
              )}

              {/* Repuestos utilizados (texto) */}
              {has(doc.parts_used) && (
                <div className="mt-3 border-t border-slate-200 pt-3">
                  <p className="font-semibold uppercase text-xs text-slate-500">Repuestos utilizados</p>
                  <p className="text-slate-700 whitespace-pre-wrap">{doc.parts_used}</p>
                </div>
              )}

              {/* Mano de obra y costos */}
              {[
                ["Descripción de mano de obra", doc.labor_description],
                ["Horas trabajadas", hasNum(doc.hours_worked) ? `${doc.hours_worked} h` : null],
                ["Costo de mano de obra", hasNum(doc.labor_cost) ? fmt(doc.labor_cost) : null],
                ["Costo de repuestos", hasNum(doc.parts_cost) ? fmt(doc.parts_cost) : null],
                ["Costo de lubricantes", hasNum(doc.lubricants_cost) ? fmt(doc.lubricants_cost) : null],
                ["Comisión del técnico", hasNum(doc.technician_commission) ? fmt(doc.technician_commission) : null],
              ].some(([, v]) => v) && (
                <div className="mt-3 space-y-1 border-t border-slate-200 pt-3">
                  <p className="font-semibold uppercase text-xs text-slate-500">Mano de obra y costos</p>
                  {[
                    ["Descripción de mano de obra", doc.labor_description],
                    ["Horas trabajadas", hasNum(doc.hours_worked) ? `${doc.hours_worked} h` : null],
                    ["Costo de mano de obra", hasNum(doc.labor_cost) ? fmt(doc.labor_cost) : null],
                    ["Costo de repuestos", hasNum(doc.parts_cost) ? fmt(doc.parts_cost) : null],
                    ["Costo de lubricantes", hasNum(doc.lubricants_cost) ? fmt(doc.lubricants_cost) : null],
                    ["Comisión del técnico", hasNum(doc.technician_commission) ? fmt(doc.technician_commission) : null],
                  ].map(([label, val]) =>
                    val ? (
                      <p key={label} className="text-slate-700">
                        <span className="font-medium text-slate-500">{label}:</span> {val}
                      </p>
                    ) : null
                  )}
                </div>
              )}

              {/* Kilometraje y aceite */}
              {[
                ["Kilometraje anterior", hasNum(doc.previous_mileage) ? Number(doc.previous_mileage).toLocaleString("es-CO") + " km" : null],
                ["Kilometraje actual", hasNum(doc.current_mileage) ? Number(doc.current_mileage).toLocaleString("es-CO") + " km" : null],
                ["Km recorridos", hasNum(doc.kms_traveled) ? Number(doc.kms_traveled).toLocaleString("es-CO") + " km" : null],
                ["Intervalo de cambio de aceite", has(doc.oil_change_interval) ? `${doc.oil_change_interval} km` : null],
                ["Próximo cambio de aceite", hasNum(doc.next_oil_change) ? Number(doc.next_oil_change).toLocaleString("es-CO") + " km" : null],
              ].some(([, v]) => v) && (
                <div className="mt-3 space-y-1 border-t border-slate-200 pt-3">
                  <p className="font-semibold uppercase text-xs text-slate-500">Kilometraje y mantenimiento</p>
                  {[
                    ["Kilometraje anterior", hasNum(doc.previous_mileage) ? Number(doc.previous_mileage).toLocaleString("es-CO") + " km" : null],
                    ["Kilometraje actual", hasNum(doc.current_mileage) ? Number(doc.current_mileage).toLocaleString("es-CO") + " km" : null],
                    ["Km recorridos", hasNum(doc.kms_traveled) ? Number(doc.kms_traveled).toLocaleString("es-CO") + " km" : null],
                    ["Intervalo de cambio de aceite", has(doc.oil_change_interval) ? `${doc.oil_change_interval} km` : null],
                    ["Próximo cambio de aceite", hasNum(doc.next_oil_change) ? Number(doc.next_oil_change).toLocaleString("es-CO") + " km" : null],
                  ].map(([label, val]) =>
                    val ? (
                      <p key={label} className="text-slate-700">
                        <span className="font-medium text-slate-500">{label}:</span> {val}
                      </p>
                    ) : null
                  )}
                </div>
              )}

              {/* Entrega y garantía */}
              {[
                ["Recomendaciones de entrega", doc.delivery_recommendations],
                ["Garantía", doc.warranty],
              ].some(([, v]) => has(v)) && (
                <div className="mt-3 space-y-1 border-t border-slate-200 pt-3">
                  <p className="font-semibold uppercase text-xs text-slate-500">Entrega y garantía</p>
                  {[
                    ["Recomendaciones de entrega", doc.delivery_recommendations],
                    ["Garantía", doc.warranty],
                  ].map(([label, val]) =>
                    has(val) ? (
                      <p key={label} className="text-slate-700 whitespace-pre-wrap">
                        <span className="font-medium text-slate-500">{label}:</span> {val}
                      </p>
                    ) : null
                  )}
                </div>
              )}

              {/* Fotos de evidencia */}
              {parsePhotos(doc.photos).length > 0 && (
                <div className="mt-3 border-t border-slate-200 pt-3">
                  <p className="font-semibold uppercase text-xs text-slate-500 mb-2">Fotos de evidencia</p>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {parsePhotos(doc.photos).map((url, i) => (
                      <Image key={i} src={url} alt={`Evidencia ${i + 1}`} className="w-full h-20 rounded border border-slate-200" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {(type === "quotation" || type === "invoice" || type === "purchase" || type === "supplier_order") && (
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
              <p className="font-semibold uppercase text-xs text-slate-500 mb-2">Concepto: Pago de comisiones por servicios prestados</p>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="text-left py-2 px-2 border border-slate-300">Fecha</th>
                    <th className="text-left py-2 px-2 border border-slate-300">Orden</th>
                    <th className="text-left py-2 px-2 border border-slate-300">Concepto</th>
                    <th className="text-left py-2 px-2 border border-slate-300">Motocicleta</th>
                    <th className="text-right py-2 px-2 border border-slate-300">Base</th>
                    <th className="text-right py-2 px-2 border border-slate-300">Comisión</th>
                  </tr>
                </thead>
                <tbody>
                  {commBreakdown.map((b) => {
                    const m = extras.motos?.find((x) => x.id === b.order.motorcycle_id);
                    return (
                      <tr key={b.order.id}>
                        <td className="py-1.5 px-2 border border-slate-300">{fmtDate(b.order.entry_date || (b.order.created_date || "").slice(0, 10))}</td>
                        <td className="py-1.5 px-2 border border-slate-300">{b.order.number || "—"}</td>
                        <td className="py-1.5 px-2 border border-slate-300">{b.concept}</td>
                        <td className="py-1.5 px-2 border border-slate-300">{motoLabel(m)}</td>
                        <td className="py-1.5 px-2 border border-slate-300 text-right">{fmt(b.base)}</td>
                        <td className="py-1.5 px-2 border border-slate-300 text-right font-medium">{fmt(b.commission)}</td>
                      </tr>
                    );
                  })}
                  {commBreakdown.length === 0 && (
                    <tr><td colSpan={6} className="py-2 px-2 border border-slate-300 text-center text-slate-400">Sin órdenes</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div className="flex justify-end mt-3">
            <div className="w-72 text-xs space-y-1 print-totals">
              {type === "order" && (() => {
                const ant = sumAnticipos(doc.anticipos);
                const totalOrd = doc.cost || items.reduce((s, i) => s + (i.subtotal || 0), 0);
                return (
                  <>
                    <div className="flex justify-between"><span>Subtotal</span><span>{fmt(items.reduce((s, i) => s + (i.subtotal || 0), 0))}</span></div>
                    <div className="flex justify-between font-bold text-sm border-t-2 border-slate-800 pt-1"><span>Total</span><span>{fmt(totalOrd)}</span></div>
                    {ant > 0 && (<>
                      <div className="flex justify-between"><span>Anticipo</span><span>-{fmt(ant)}</span></div>
                      <div className="flex justify-between font-bold text-sm border-t-2 border-slate-800 pt-1"><span>Saldo a pagar</span><span>{fmt(Math.max(0, totalOrd - ant))}</span></div>
                    </>)}
                  </>
                );
              })()}
              {(type === "quotation" || type === "invoice") && (() => {
                const ant = Number(doc.anticipo) || 0;
                return (
                  <>
                    <div className="flex justify-between"><span>Subtotal</span><span>{fmt(doc.subtotal)}</span></div>
                    {!!Number(doc.iva) && <div className="flex justify-between"><span>IVA</span><span>{fmt(doc.iva)}</span></div>}
                    {!!Number(doc.discount) && <div className="flex justify-between"><span>Descuento</span><span>-{fmt(doc.discount)}</span></div>}
                    <div className="flex justify-between font-bold text-sm border-t-2 border-slate-800 pt-1"><span>Total</span><span>{fmt(doc.total)}</span></div>
                    {ant > 0 && (<>
                      <div className="flex justify-between"><span>Anticipo</span><span>-{fmt(ant)}</span></div>
                      <div className="flex justify-between font-bold text-sm border-t-2 border-slate-800 pt-1"><span>Saldo a pagar</span><span>{fmt(Math.max(0, Number(doc.total) - ant))}</span></div>
                    </>)}
                  </>
                );
              })()}
              {type === "purchase" && (
                <>
                  <div className="flex justify-between"><span>Subtotal</span><span>{fmt(doc.subtotal)}</span></div>
                  {!!Number(doc.iva_total) && <div className="flex justify-between"><span>IVA</span><span>{fmt(doc.iva_total)}</span></div>}
                  {!!Number(doc.transport_cost) && <div className="flex justify-between"><span>Transporte</span><span>{fmt(doc.transport_cost)}</span></div>}
                  {!!Number(doc.discount) && <div className="flex justify-between"><span>Descuento</span><span>-{fmt(doc.discount)}</span></div>}
                  <div className="flex justify-between font-bold text-sm border-t-2 border-slate-800 pt-1"><span>Total</span><span>{fmt(doc.total)}</span></div>
                </>
              )}
              {type === "supplier_order" && (
                <>
                  <div className="flex justify-between"><span>Subtotal</span><span>{fmt(doc.subtotal)}</span></div>
                  {chargesIva && !!Number(doc.iva_total) && <div className="flex justify-between"><span>IVA</span><span>{fmt(doc.iva_total)}</span></div>}
                  <div className="flex justify-between font-bold text-sm border-t-2 border-slate-800 pt-1"><span>Total estimado</span><span>{fmt(doc.total)}</span></div>
                </>
              )}
              {type === "loan" && (
                <div className="flex justify-between font-bold text-sm border-t-2 border-slate-800 pt-1"><span>Saldo pendente</span><span>{fmt(doc.balance)}</span></div>
              )}
              {type === "commission" && (
                <>
                  <div className="flex justify-between"><span>Total comisiones</span><span>{fmt(commTotal)}</span></div>
                  <div className="flex justify-between"><span>Descuentos</span><span>-{fmt(doc.loans_deducted)}</span></div>
                  <div className="flex justify-between font-bold text-sm border-t-2 border-slate-800 pt-1"><span>Neto a pagar</span><span>{fmt(commNet)}</span></div>
                </>
              )}
            </div>
          </div>

          {/* Firmas digitales */}
          {((type === "order") || (type === "commission")) && (
            <div className="mt-8 grid grid-cols-2 gap-8">
              {type === "order" && (
                <>
                  <SignatureBlock label="Firma del Cliente" img={doc.customer_signature} name={customer?.name} docId={customer?.document_number} />
                  <SignatureBlock label="Firma del Técnico" img={doc.technician_signature} name={technician?.name} docId={technician?.document_number} />
                </>
              )}
              {type === "commission" && (
                <>
                  <SignatureBlock label="Firma del Técnico (Recibido)" img={doc.technician_signature} name={technician?.name} docId={technician?.document_number} />
                  <SignatureBlock label="Firma del Administrador (Autoriza)" img={doc.admin_signature} name={company?.name} docId={company?.document_number} />
                </>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-3 border-t border-slate-200 text-[11px] text-slate-600 text-center space-y-1">
            {type === "order" && company?.footer_text && <p className="whitespace-pre-wrap">{company.footer_text}</p>}
            {type === "order" && has(doc.admin_footer) && <p className="whitespace-pre-wrap">{doc.admin_footer}</p>}
            <p>Documento generado el {momentBogota().format("DD/MM/YYYY")}.</p>
          </div>
        </div>
      </div>
    </div>
  );
}