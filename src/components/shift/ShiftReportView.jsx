import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { fmtBogota } from "@/lib/localDate";

const fmt = (n) => `$${(n || 0).toLocaleString("es-CO")}`;

function Section({ title, children }) {
  return (
    <div className="mb-4">
      <p className="font-bold border-b border-slate-400 mb-1 pb-0.5">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : ""}`}><span>{label}</span><span>{value}</span></div>
  );
}

export default function ShiftReportView({ report: r, onClose }) {
  const diff = r.difference;
  const [format, setFormat] = useState("a4");
  const [company, setCompany] = useState(null);

  useEffect(() => {
    base44.entities.Company.list("-created_date", 1).then((l) => setCompany((l.items || l)[0] || null));
  }, []);

  const handlePrint = () => {
    const body = document.body;
    body.classList.toggle("print-80mm", format === "80mm");
    const cleanup = () => {
      body.classList.remove("print-80mm");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  };

  const fmtBtn = (f) => `px-3 py-1.5 font-medium text-xs ${format === f ? "bg-slate-800 text-white" : "bg-white text-slate-700 hover:bg-slate-100"}`;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-100 overflow-y-auto">
      <div className="no-print sticky top-0 bg-white border-b px-4 py-3 flex flex-wrap justify-between items-center gap-2">
        <div className="inline-flex rounded-md border border-slate-300 overflow-hidden">
          <button type="button" onClick={() => setFormat("a4")} className={fmtBtn("a4")}>Carta</button>
          <button type="button" onClick={() => setFormat("80mm")} className={`${fmtBtn("80mm")} border-l border-slate-300`}>Tirilla 80 mm</button>
        </div>
        <div className="flex gap-2">
          <Button onClick={handlePrint} className="bg-amber-500 hover:bg-amber-600 text-slate-900"><Printer className="w-4 h-4" /> Imprimir</Button>
          <Button variant="outline" onClick={onClose}><X className="w-4 h-4" /> Cerrar</Button>
        </div>
      </div>
      <div className="print-area bg-white max-w-3xl mx-auto my-4 p-6 text-xs text-slate-900">
        <div className="text-center mb-4">
          {company?.logo && <img src={company.logo} alt="Logo" className="h-14 mx-auto mb-1 object-contain" />}
          {company?.name && <p className="text-base font-bold">{company.name}</p>}
          <h2 className="text-xl font-bold">Reporte de cierre de turno</h2>
          <p className="text-slate-600">{r.register} · Turno {r.turno_number ?? "—"}</p>
        </div>

        <Section title="Datos del turno">
          <div className="grid grid-cols-2 gap-1">
            <p><b>Turno:</b> {r.register} #{r.turno_number ?? "—"}</p>
            <p><b>Fecha:</b> {fmtBogota(r.close_date, "DD/MM/YYYY")}</p>
            <p><b>Horario:</b> {fmtBogota(r.open_date, "DD/MM/YYYY HH:mm")} – {fmtBogota(r.close_date, "DD/MM/YYYY HH:mm")}</p>
            <p><b>Responsable:</b> {r.responsible || "—"}</p>
            {r.shift_vendedor && <p><b>Vendedor de apertura:</b> {r.shift_vendedor}</p>}
          </div>
        </Section>

        <Section title="Ventas totales por método de pago">
          {r.sales_by_method.length === 0 && <p className="text-slate-500">Sin ventas en el turno.</p>}
          {r.sales_by_method.map((m) => <Row key={m.method} label={m.method} value={fmt(m.amount)} />)}
          <div className="border-t border-slate-300 mt-1 pt-1"><Row label="Total ventas" value={fmt(r.sales_total)} bold /></div>
        </Section>

        <Section title="Ventas por categoría">
          {r.by_category.map((c) => <Row key={c.category} label={`${c.category} (${c.qty} und.)`} value={fmt(c.value)} />)}
        </Section>

        <Section title="Ventas por producto">
          {r.by_product.length > 0 && (
            <table className="w-full">
              <thead><tr className="text-left border-b border-slate-300"><th>Producto</th><th>Categoría</th><th className="text-right">Cant.</th><th className="text-right">Valor</th></tr></thead>
              <tbody>
                {r.by_product.map((p) => (
                  <tr key={p.name} className="border-b border-slate-100"><td>{p.name}</td><td>{p.category}</td><td className="text-right">{p.qty}</td><td className="text-right">{fmt(p.value)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {(r.by_service || []).length > 0 && (
          <Section title="Ventas por servicio">
            <table className="w-full">
              <thead><tr className="text-left border-b border-slate-300"><th>Servicio</th><th>Categoría</th><th className="text-right">Cant.</th><th className="text-right">Valor</th></tr></thead>
              <tbody>
                {r.by_service.map((p) => (
                  <tr key={p.name} className="border-b border-slate-100"><td>{p.name}</td><td>{p.category}</td><td className="text-right">{p.qty}</td><td className="text-right">{fmt(p.value)}</td></tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        <Section title="Gastos y retiros de caja">
          {r.outflows.length === 0 && <p className="text-slate-500">Sin gastos ni retiros.</p>}
          {r.outflows.map((o, i) => (
            <Row key={i} label={`${o.category} · ${o.description || "—"} (${fmtBogota(o.date, "HH:mm")})`} value={fmt(o.amount)} />
          ))}
          <div className="border-t border-slate-300 mt-1 pt-1"><Row label="Total gastos y retiros" value={fmt(r.outflows_total)} bold /></div>
        </Section>

        <Section title="Cuadre de efectivo">
          <Row label="Base inicial" value={fmt(r.base)} />
          <Row label="(+) Entradas" value={fmt(r.entradas)} />
          <Row label="(−) Salidas" value={fmt(r.salidas)} />
          <Row label="Efectivo esperado" value={fmt(r.expected)} bold />
          <Row label="Efectivo contado" value={fmt(r.counted)} />
          <Row label="Diferencia" value={diff === 0 ? "Cuadre exacto" : `${diff > 0 ? "Sobrante" : "Faltante"}: ${fmt(Math.abs(diff))}`} bold />
        </Section>

        <Section title="Transacciones y anulaciones">
          <Row label="Número de transacciones" value={r.transactions} />
          <Row label="Número de anulaciones" value={`${r.voids.length} (${fmt(r.voids_total)})`} />
          {r.voids.map((v, i) => (
            <p key={i} className="text-slate-700">• Venta {v.sale_number || "—"} · {fmt(v.amount)} · {v.reason || "Sin motivo"} · Autorizó: <b>{v.authorized_by}</b></p>
          ))}
        </Section>

        <div className="grid grid-cols-2 gap-8 mt-12 text-center">
          <div className="border-t border-slate-500 pt-1">{r.responsible || "Responsable"}</div>
          <div className="border-t border-slate-500 pt-1">Administrador</div>
        </div>
      </div>
    </div>
  );
}