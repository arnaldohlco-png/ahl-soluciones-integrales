import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { fetchAll } from "@/lib/entityLoader";
import { registerForPayment } from "@/lib/cashRegister";
import BankAccountSelect, { needsBank } from "@/components/BankAccountSelect";
import SearchableSelect from "@/components/SearchableSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import nowLocalISO from "@/lib/localDate";

const METHODS = ["Efectivo", "Transferencia", "Tarjeta", "Otros"];
const fmt = (n) => `$${(n || 0).toLocaleString("es-CO")}`;

export default function CreditPaymentDialog({ open, onOpenChange, onSaved }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selId, setSelId] = useState("");
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("Efectivo");
  const [bank, setBank] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelId(""); setAmount(0); setMethod("Efectivo"); setBank("");
    setLoading(true);
    fetchAll("AccountReceivable")
      .then((d) => setPending(d.filter((r) => (r.balance || 0) > 0)))
      .finally(() => setLoading(false));
  }, [open]);

  const sel = pending.find((r) => r.id === selId);
  const items = pending.map((r) => ({
    id: r.id,
    label: `${r.customer_name || "Cliente"}${r.invoice_number ? " · " + r.invoice_number : ""}`,
    sublabel: `Saldo ${fmt(r.balance)}`,
  }));

  const save = async () => {
    if (!sel) { alert("Selecciona una venta a crédito."); return; }
    if (!amount || amount <= 0) { alert("Ingresa el monto del abono."); return; }
    if (amount > (sel.balance || 0)) { alert("El abono no puede exceder el saldo pendiente."); return; }
    if (needsBank(method) && !bank) { alert("Selecciona la cuenta bancaria."); return; }
    setSaving(true);
    try {
      const payments = JSON.parse(sel.payments || "[]");
      payments.push({ date: nowLocalISO(), amount, method });
      const newBalance = Math.max(0, (sel.balance || 0) - amount);
      await base44.entities.AccountReceivable.update(sel.id, {
        payments: JSON.stringify(payments), balance: newBalance,
        status: newBalance <= 0 ? "Pagada" : "Al día",
      });
      if (newBalance <= 0 && sel.invoice_id) {
        const inv = await base44.entities.Invoice.get(sel.invoice_id);
        if (inv && inv.status !== "Pagada") {
          await base44.entities.Invoice.update(sel.invoice_id, { status: "Pagada", amount_paid: inv.total || 0 });
        }
      }
      if (sel.customer_id) {
        const c = await base44.entities.Customer.get(sel.customer_id);
        if (c) await base44.entities.Customer.update(sel.customer_id, { balance: Math.max(0, (c.balance || 0) - amount) });
      }
      await base44.entities.CashMovement.create({
        date: nowLocalISO(), type: "Entrada", category: "Abono", amount,
        description: `Abono venta a crédito${sel.invoice_number ? " " + sel.invoice_number : ""} - ${sel.customer_name || ""}`,
        payment_method: method, register_type: registerForPayment(method),
        bank_account: bank || undefined, reference_id: sel.id,
      });
      onOpenChange(false);
      onSaved();
    } catch (e) { console.error(e); alert("No se pudo registrar el abono."); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Cobro de venta a crédito</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <Label>Venta pendiente *</Label>
            {loading ? <p className="text-sm text-slate-400">Cargando...</p> : pending.length === 0 ? (
              <p className="text-sm text-slate-400">No hay ventas a crédito con saldo pendiente.</p>
            ) : (
              <SearchableSelect items={items} value={selId} onValueChange={(id) => { setSelId(id); const r = pending.find((x) => x.id === id); setAmount(r?.balance || 0); }} placeholder="Buscar cliente o factura..." />
            )}
          </div>
          {sel && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm flex justify-between">
              <span className="text-slate-500">Saldo pendiente</span>
              <span className="font-semibold">{fmt(sel.balance)}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Monto del abono *</Label>
              <Input type="number" value={amount === 0 ? "" : amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Medio de pago</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
              <BankAccountSelect method={method} value={bank} onChange={setBank} />
            </div>
          </div>
          {sel && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-700">
              Nuevo saldo: <strong>{fmt(Math.max(0, (sel.balance || 0) - amount))}</strong>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !sel} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
            {saving ? "Guardando..." : "Registrar cobro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}