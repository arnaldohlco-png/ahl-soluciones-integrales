import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Landmark, Plus, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const EMPTY = { name: "", bank: "", account_number: "", holder: "", active: true };

export default function BankAccountsManager() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const p = await base44.entities.BankAccount.filter({}, { sort: "name", limit: 200 });
    setList(p.items || []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const { id, ...data } = form;
    if (id) await base44.entities.BankAccount.update(id, data);
    else await base44.entities.BankAccount.create(data);
    setSaving(false);
    setForm(null);
    load();
  };

  const toggle = async (a) => {
    await base44.entities.BankAccount.update(a.id, { active: !a.active });
    load();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Landmark className="w-4 h-4" /> Cuentas bancarias</h3>
        <Button size="sm" onClick={() => setForm({ ...EMPTY })} className="bg-amber-500 hover:bg-amber-600 text-slate-900"><Plus className="w-4 h-4" /> Nueva cuenta</Button>
      </div>
      <p className="text-xs text-slate-500">Se ofrecen al registrar pagos por transferencia o tarjeta. Las desactivadas no aparecen en pagos nuevos.</p>
      {list.length === 0 && <p className="text-sm text-slate-400">Aún no hay cuentas.</p>}
      {list.map((a) => (
        <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-3">
          <div className={a.active === false ? "opacity-50" : ""}>
            <p className="text-sm font-medium text-slate-800">{a.name}</p>
            <p className="text-xs text-slate-500">{[a.bank, a.account_number, a.holder].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={a.active !== false} onCheckedChange={() => toggle(a)} />
            <Button size="icon" variant="ghost" onClick={() => setForm({ ...EMPTY, ...a })}><Pencil className="w-4 h-4" /></Button>
          </div>
        </div>
      ))}
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{form?.id ? "Editar cuenta" : "Nueva cuenta"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              {[["name", "Nombre (ej. Bancolombia ahorros) *"], ["bank", "Banco"], ["account_number", "Número de cuenta"], ["holder", "Titular"]].map(([k, l]) => (
                <div key={k}>
                  <Label className="text-xs">{l}</Label>
                  <Input className="mt-1" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form?.name?.trim()} className="bg-amber-500 hover:bg-amber-600 text-slate-900">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}