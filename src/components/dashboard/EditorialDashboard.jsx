import React from "react";
import { Image } from "@/components/ui/image";
import { momentBogota } from "@/lib/localDate";
import EdArea from "@/components/dashboard/EdArea";
import EdRow from "@/components/dashboard/EdRow";

const HERO_IMG = "https://media.base44.com/images/public/6aa16a1f0b9991c625ec0ea5/9f5737787_generated_f32b24c4.jpg";
const ALMACEN_IMG = "https://media.base44.com/images/public/6aa16a1f0b9991c625ec0ea5/480e6a41b_generated_14b7740b.jpg";
const CAJA_IMG = "https://media.base44.com/images/public/6aa16a1f0b9991c625ec0ea5/32250283b_generated_668d4c9b.jpg";
const STATES = ["Ingresado", "En proceso", "Terminado", "Entregado"];
const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export default function EditorialDashboard({ d, company, fmt, canClose, onCloseShift, onOpenMenu, canRestore, onRestore }) {
  const contact = [
    company?.document_number && `NIT/C.C.: ${company.document_number}`,
    company?.phone,
    company?.email,
    [company?.address, company?.city].filter(Boolean).join(" · "),
  ].filter(Boolean).join("  ·  ");

  return (
    <div className="ed-root min-h-screen bg-[#F3EDE2] text-[#111] px-4 md:px-16 pt-8 md:pt-12 pb-12 md:pb-14">
      <div className="ed-fade flex items-center justify-between gap-3 flex-wrap pb-3.5">
        <span className="ed-sans text-[12px] tracking-[0.2em] uppercase font-medium">
          {DAYS[momentBogota().day()]} · {momentBogota().format("DD/MM/YYYY")}
        </span>
        <div className="flex gap-3">
          {canClose && <button type="button" onClick={onCloseShift} className="ed-btn ed-btn-red">Cerrar turno</button>}
          <button type="button" onClick={onOpenMenu} aria-label="Abrir menú" className="ed-btn">Abrir menú</button>
        </div>
      </div>
      <div className="ed-rule" />

      <div className="ed-fade text-center pt-[34px] pb-[26px]" style={{ animationDelay: "0.15s" }}>
        {company?.logo && <img src={company.logo} alt="Logo" className="h-14 w-auto max-w-full object-contain mx-auto mb-3" />}
        <h1 className="text-[36px] md:text-[76px] leading-[1.05] font-normal tracking-[0.02em] uppercase">{company?.name || "Mi Taller"}</h1>
        {contact && <p className="ed-sans text-[11px] md:text-xs tracking-[0.08em] mt-3">{contact}</p>}
      </div>
      <div className="ed-rule2" />

      <div className="ed-fade ed-sepia h-[160px] md:h-[300px] border border-[#111] mt-[26px] overflow-hidden" style={{ animationDelay: "0.3s" }}>
        <Image src={HERO_IMG} alt="Taller de motocicletas" fittingType="fill" className="w-full h-full" />
      </div>

      <div className="ed-fade pt-[30px] pb-7" style={{ animationDelay: "0.4s" }}>
        <div className="ed-sans text-xs tracking-[0.28em] uppercase font-semibold text-[#8A1C1C] mb-[18px]">Órdenes por estado</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 md:flex md:items-baseline md:justify-between md:gap-5">
          {STATES.map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 && <div className="hidden md:block w-px self-stretch bg-[#D6CBB5]" />}
              <div className="flex items-baseline gap-3">
                <b className="text-[48px] md:text-[84px] leading-none font-normal tabular-nums">{d.ordersByStatus?.[s] || 0}</b>
                <span className="ed-sans text-[11px] md:text-[13px] tracking-[0.16em] uppercase font-medium">{s}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="ed-rule" />

      <EdArea title="Taller" image={HERO_IMG} delay={0.5}>
        <EdRow to="/ordenes" label="Motos en taller" value={d.motosInWorkshopCount} />
        <EdRow to="/ordenes" label="Órdenes pendientes" value={d.pendingOrders} />
        <EdRow to="/ordenes" label="Ingresos taller (servicios)" value={fmt(d.workshopIncome)} />
        <EdRow to="/ordenes" sub red label="Utilidad" value={fmt(d.workshopProfit)} />
      </EdArea>

      <EdArea title="Almacén" image={ALMACEN_IMG} delay={0.6}>
        <EdRow to="/ventas" label="Ingresos almacén (productos)" value={fmt(d.storeIncome)} />
        <EdRow to="/ventas" sub red label="Utilidad" value={fmt(d.storeProfit)} />
        <EdRow to="/inventario" red label="Productos stock bajo" value={d.lowStock?.length || 0} />
        <EdRow to="/facturacion" label="Facturas pendientes" value={d.pendingInvoices} />
      </EdArea>

      <EdArea title="Caja" image={CAJA_IMG} delay={0.7}>
        <EdRow hl label="Ventas del día" value={fmt(d.salesToday)} />
        <EdRow label="Ventas de la semana" value={fmt(d.salesWeek)} />
        <EdRow label="Ventas del mes" value={fmt(d.salesMonth)} />
        <EdRow to="/creditos" label="Cuentas por cobrar" value={fmt(d.totalReceivables)} />
        <EdRow to="/gastos" red label="Gastos totales" value={fmt(d.totalExpenses)} />
        <EdRow hl label="Utilidad estimada" value={fmt(d.estimatedProfit)} />
      </EdArea>

      {canRestore && (
        <div className="ed-fade mt-[46px] pt-5 border-t border-[#111] flex items-center gap-[18px] flex-wrap" style={{ animationDelay: "0.9s" }}>
          <button type="button" onClick={onRestore} className="ed-link">Restaurar copia</button>
          <button type="button" onClick={onRestore} className="ed-btn ed-btn-sm">Restaurar</button>
        </div>
      )}
    </div>
  );
}