import React from "react";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { isApertura, isCierre, turnoWindow } from "@/lib/turnos";
import { fmtBogota } from "@/lib/localDate";

const fmt = (n) => `$${(n || 0).toLocaleString("es-CO")}`;

// Informe imprimible del cierre de turno con todos los movimientos de caja del turno.
// turno: { turno, vendedor, openDate, base, closeDate }
export default function TurnoPrintReport({ list, register, turno, counted, onClose }) {
  const movs = turnoWindow(list, register, turno.openDate, turno.closeDate)
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const real = movs.filter((m) => !isApertura(m) && !isCierre(m));
  const entradas = real.filter((m) => m.type === "Entrada").reduce((s, m) => s + (m.amount || 0), 0);
  const salidas = real.filter((m) => m.type === "Salida").reduce((s, m) => s + (m.amount || 0), 0);
  const esperado = (turno.base || 0) + entradas - salidas;
  const hasCounted = counted !== undefined && counted !== null;
  const diff = hasCounted ? Number(counted) - esperado : null;
  const methods = ["Efectivo", "Transferencia", "Tarjeta", "Otros"].map((pm) => ({
    pm,
    ent: real.filter((m) => m.payment_method === pm && m.type === "Entrada").reduce((s, m) => s + (m.amount || 0), 0),
    sal: real.filter((m) => m.payment_method === pm && m.type === "Salida").reduce((s, m) => s + (m.amount || 0), 0),
  })).filter((x) => x.ent || x.sal);

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
      <div className="no-print sticky top-0 bg-white border-b px-4 py-3 flex justify-end gap-2">
        <Button onClick={() => window.print()} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
          <Printer className="w-4 h-4" /> Imprimir
        </Button>
        <Button variant="outline" onClick={onClose}><X className="w-4 h-4" /> Cerrar</Button>
      </div>
      <div className="print-area bg-white max-w-3xl mx-auto my-4 p-6 text-sm text-slate-900">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold">Cierre de turno</h2>
          <p className="text-slate-600">{register} · Turno {turno.turno ?? "—"}</p>
        </div>
        <div className="grid grid-cols-2 gap-1 mb-4 text-xs">
          <p><b>Vendedor:</b> {turno.vendedor || "Sin vendedor"}</p>
          <p><b>Apertura:</b> {fmtBogota(turno.openDate)}</p>
          <p><b>Cierre:</b> {turno.closeDate ? fmtBogota(turno.closeDate) : "Turno abierto"}</p>
          <p><b>Movimientos:</b> {movs.length}</p>
        </div>

        <table className="w-full text-xs mb-4">
          <thead>
            <tr className="border-b border-slate-400 text-left">
              <th className="py-1">Fecha</th><th>Tipo</th><th>Categoría</th><th>Descripción</th><th>Pago</th>
              <th className="text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {movs.map((m) => (
              <tr key={m.id} className="border-b border-slate-200">
                <td className="py-1 whitespace-nowrap">{fmtBogota(m.date)}</td>
                <td>{m.type}</td>
                <td>{m.category}</td>
                <td>{m.description || "—"}</td>
                <td>{m.payment_method}</td>
                <td className="text-right whitespace-nowrap">{m.type === "Entrada" ? "+" : "-"}{fmt(m.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {methods.length > 0 && (
          <div className="mb-4 text-xs">
            <p className="font-semibold mb-1">Por forma de pago</p>
            {methods.map((x) => (
              <div key={x.pm} className="flex justify-between">
                <span>{x.pm}</span><span>Entradas {fmt(x.ent)} · Salidas {fmt(x.sal)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="ml-auto w-72 space-y-1">
          <div className="flex justify-between"><span>Base inicial</span><span>{fmt(turno.base)}</span></div>
          <div className="flex justify-between"><span>(+) Entradas</span><span>{fmt(entradas)}</span></div>
          <div className="flex justify-between"><span>(−) Salidas</span><span>{fmt(salidas)}</span></div>
          <div className="flex justify-between border-t border-slate-400 pt-1 font-bold"><span>Saldo esperado</span><span>{fmt(esperado)}</span></div>
          {hasCounted && (
            <>
              <div className="flex justify-between"><span>Monto contado</span><span>{fmt(Number(counted))}</span></div>
              <div className="flex justify-between font-bold">
                <span>Diferencia</span>
                <span>{diff === 0 ? "Cuadre exacto" : `${diff > 0 ? "Sobrante" : "Faltante"}: ${fmt(Math.abs(diff))}`}</span>
              </div>
            </>
          )}
        </div>
        <div className="grid grid-cols-2 gap-8 mt-12 text-center text-xs">
          <div className="border-t border-slate-500 pt-1">Vendedor</div>
          <div className="border-t border-slate-500 pt-1">Administrador</div>
        </div>
      </div>
    </div>
  );
}