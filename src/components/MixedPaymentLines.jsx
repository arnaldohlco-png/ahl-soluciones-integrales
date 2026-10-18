import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BankAccountSelect from "@/components/BankAccountSelect";
import { Plus, Trash2 } from "lucide-react";
import { newLine, resolveLines } from "@/lib/mixedPayments";

const fmt = (n) => `$${(n || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;

// Líneas de pago mixto: método + monto (+ cuenta bancaria). El saldo no pagado queda a crédito.
export default function MixedPaymentLines({ lines, setLines, total, emptyMeansFull = true }) {
  const r = resolveLines(lines, total, emptyMeansFull);
  const update = (i, patch) => setLines(lines.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  return (
    <div className="space-y-2">
      {lines.map((l, i) => (
        <div key={i} className="flex flex-wrap items-start gap-2">
          <div className="w-36">
            <Select value={l.method} onValueChange={(v) => update(i, { method: v, bank_account: "" })}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Efectivo", "Transferencia", "Tarjeta", "Otros"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Input type="number" placeholder={lines.length === 1 && emptyMeansFull ? String(total) : "Monto"} value={l.amount}
            onChange={(e) => update(i, { amount: e.target.value })} className="w-32 h-8 text-right text-sm" />
          <div className="flex-1 min-w-[140px]">
            <BankAccountSelect method={l.method} value={l.bank_account} onChange={(v) => update(i, { bank_account: v })} />
          </div>
          {lines.length > 1 && (
            <button type="button" onClick={() => setLines(lines.filter((_, k) => k !== i))} className="p-1.5 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => setLines([...lines, newLine("Transferencia")])}>
        <Plus className="w-3.5 h-3.5" /> Agregar forma de pago
      </Button>
      <div className="text-sm space-y-0.5 pt-1">
        <div className="flex justify-between"><span className="text-slate-500">Total recibido</span><b>{fmt(r.paid)}</b></div>
        {r.remaining > 0 && <div className="flex justify-between text-amber-700"><span>Saldo a crédito</span><b>{fmt(r.remaining)}</b></div>}
        {r.change > 0 && <div className="flex justify-between text-emerald-700"><span>Cambio/Vueltas</span><b>{fmt(r.change)}</b></div>}
        {r.error && <p className="text-xs text-red-600">{r.error}</p>}
      </div>
    </div>
  );
}