import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Wallet } from "lucide-react";
import { parseAnticipos, sumAnticipos } from "@/lib/anticipos";
import BankAccountSelect from "@/components/BankAccountSelect";

const METHODS = ["Efectivo", "Transferencia"];

import { todayLocalKey } from "@/lib/localDate";

const fmt = (n) => "$" + (Number(n) || 0).toLocaleString("es-CO");

// value: JSON string de [{date, amount, method}]
export default function AnticiposEditor({ value, onChange }) {
  const items = parseAnticipos(value);
  const total = sumAnticipos(value);

  const today = todayLocalKey();

  const add = () => {
    onChange(JSON.stringify([...items, { date: today, amount: 0, method: "Efectivo" }]));
  };

  const update = (i, field, val) => {
    const next = items.map((it, idx) => (idx === i ? { ...it, [field]: val } : it));
    onChange(JSON.stringify(next));
  };

  const remove = (i) => {
    onChange(JSON.stringify(items.filter((_, idx) => idx !== i)));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5" /> Anticipos
        </p>
        <Button type="button" variant="outline" size="sm" onClick={add} className="h-7 text-xs">
          <Plus className="w-3.5 h-3.5" /> Anticipo
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-slate-400 py-2">Sin anticipos registrados.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
              <Input
                type="date"
                value={it.date || today}
                onChange={(e) => update(i, "date", e.target.value)}
                className="col-span-4 h-8 text-xs"
              />
              <Input
                type="number"
                placeholder="Monto"
                value={it.amount === 0 ? "" : it.amount}
                onChange={(e) => update(i, "amount", e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                className="col-span-4 h-8 text-xs"
              />
              <Select value={it.method || "Efectivo"} onValueChange={(v) => update(i, "method", v)}>
                <SelectTrigger className="col-span-3 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              {it.method === "Transferencia" && (
                <div className="col-span-12">
                  <BankAccountSelect method={it.method} value={it.bank} onChange={(v) => update(i, "bank", v)} />
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                className="col-span-1 flex items-center justify-center text-slate-300 hover:text-red-500"
                title="Eliminar anticipo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <div className="flex justify-end pt-1 border-t border-slate-100">
            <span className="text-xs text-slate-500">Total anticipos: <span className="font-bold text-emerald-700">{fmt(total)}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}