import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { findOpenTurno, nextTurnoNumber, buildAperturaDescription } from "@/lib/turnos";
import nowLocalISO from "@/lib/localDate";

const REGISTERS = ["Caja almacén", "Bancos"];
const READERS = ["admin", "administrador", "gerente"];
const SESSION_KEY = "turno-prompt-dismissed";

async function loadTurnoMovements() {
  const page = await base44.entities.CashMovement.filter(
    { description: { $regex: "(Apertura|Cierre) de caja" } },
    { sort: "-date", limit: 500 }
  );
  return page.items || [];
}

export default function TurnoOpeningPrompt() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);
  const [forms, setForms] = useState({});
  const [saving, setSaving] = useState("");

  const pending = REGISTERS.filter((r) => !findOpenTurno(list, r));
  const canRead = READERS.includes(user?.role);

  const refresh = async () => {
    const l = await loadTurnoMovements();
    setList(l);
    return l;
  };

  useEffect(() => {
    if (!canRead || sessionStorage.getItem(SESSION_KEY)) return;
    refresh().then((l) => {
      if (REGISTERS.some((r) => !findOpenTurno(l, r))) setOpen(true);
    });
  }, [canRead]);

  const close = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setOpen(false);
  };

  const getForm = (r) => forms[r] || { vendedor: user?.full_name || "", amount: "" };
  const setForm = (r, patch) => setForms((f) => ({ ...f, [r]: { ...getForm(r), ...patch } }));

  const openTurno = async (r) => {
    const f = getForm(r);
    const amount = Number(f.amount);
    if (!amount || amount <= 0 || !f.vendedor.trim()) return;
    setSaving(r);
    const fresh = await refresh();
    if (!findOpenTurno(fresh, r)) {
      const n = nextTurnoNumber(fresh, r);
      await base44.entities.CashMovement.create({
        type: "Entrada",
        category: "Otro ingreso",
        amount,
        description: buildAperturaDescription(n, f.vendedor.trim(), r),
        payment_method: "Efectivo",
        register_type: r,
        reference_id: `TURNO-${n}`,
        date: nowLocalISO(),
      });
    }
    const l = await refresh();
    setSaving("");
    if (REGISTERS.every((x) => findOpenTurno(l, x))) close();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Abrir turnos de caja</DialogTitle>
          <DialogDescription>Estas cajas no tienen un turno abierto. Ábrelas ahora o continúa y hazlo después desde Caja y Bancos.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {pending.map((r) => {
            const f = getForm(r);
            return (
              <div key={r} className="rounded-lg border border-slate-200 p-3 space-y-2">
                <p className="font-semibold text-slate-800 text-sm">{r}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Vendedor *</Label>
                    <Input value={f.vendedor} onChange={(e) => setForm(r, { vendedor: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Base inicial *</Label>
                    <Input type="number" placeholder="0" value={f.amount} onChange={(e) => setForm(r, { amount: e.target.value })} className="mt-1" />
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => openTurno(r)}
                  disabled={saving === r || !f.vendedor.trim() || !(Number(f.amount) > 0)}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-900"
                >
                  {saving === r ? "Abriendo..." : "Abrir turno"}
                </Button>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>Ahora no</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}