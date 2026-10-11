import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";
import { momentBogota } from "@/lib/localDate";

const fmt = (n) => (Number(n) || 0).toLocaleString("es-CO");

export default function CobroDialog({ open, onOpenChange, doc, company, onConfirm }) {
  const chargesIva = company ? (company.charges_iva ?? (company.document_type === "Persona jurídica")) : true;

  const [items, setItems] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState("Contado");
  const [creditDays, setCreditDays] = useState(30);
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [discMode, setDiscMode] = useState("pesos");
  const [discValue, setDiscValue] = useState(0);
  const [amountPaid, setAmountPaid] = useState("");

  useEffect(() => {
    if (!doc) return;
    let parsed = [];
    try { const p = JSON.parse(doc.items || "[]"); if (Array.isArray(p)) parsed = p; } catch (e) { /* ignore */ }
    setItems(parsed.map((i) => ({ ...i, item_disc_mode: i.item_disc_mode || "pesos", item_disc: Number(i.item_disc) || 0 })));
    setPaymentTerms(doc.payment_terms || "Contado");
    setCreditDays(doc.credit_days || 30);
    setPaymentMethod("Efectivo");
    setDiscMode("pesos");
    setDiscValue(0);
    setAmountPaid("");
  }, [doc]);

  const lineSubtotal = (it) => {
    const gross = (Number(it.unit_price) || 0) * (Number(it.quantity) || 0);
    const d = Number(it.item_disc) || 0;
    const amt = it.item_disc_mode === "porcentaje" ? Math.round((gross * d) / 100) : Math.min(d, gross);
    return Math.max(0, gross - amt);
  };

  const subtotal = useMemo(() => items.reduce((s, i) => s + lineSubtotal(i), 0), [items]);
  const iva = chargesIva ? Math.round(subtotal * 0.19) : 0;
  const globalDisc = discMode === "porcentaje"
    ? Math.round((subtotal * (Number(discValue) || 0)) / 100)
    : Math.min(Number(discValue) || 0, subtotal);
  const total = Math.max(0, subtotal + iva - globalDisc);
  const received = paymentTerms === "Contado" ? (Number(amountPaid) || total) : (Number(amountPaid) || 0);
  const change = Math.max(0, received - total);
  const dueDate = paymentTerms === "Crédito" && creditDays > 0
    ? moment(doc?.date || momentBogota().format("YYYY-MM-DD"), "YYYY-MM-DD").add(Number(creditDays), "days").format("YYYY-MM-DD")
    : "";

  const setItem = (idx, field, value) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const confirm = () => {
    const updatedItems = items.map((it) => {
      const gross = (Number(it.unit_price) || 0) * (Number(it.quantity) || 0);
      const d = Number(it.item_disc) || 0;
      const discAmt = it.item_disc_mode === "porcentaje" ? Math.round((gross * d) / 100) : Math.min(d, gross);
      return { ...it, subtotal: Math.max(0, gross - discAmt), item_disc: d, item_disc_mode: it.item_disc_mode, item_disc_amount: discAmt };
    });
    const payload = {
      items: JSON.stringify(updatedItems),
      subtotal, iva, discount: globalDisc, total,
      payment_terms: paymentTerms,
      credit_days: paymentTerms === "Crédito" ? Number(creditDays) || 0 : 0,
      payment_due_date: dueDate,
      installments: 1,
      installment_amount: 0,
      amount_paid: received,
      change: paymentTerms === "Contado" ? change : 0,
      status: paymentTerms === "Contado" ? "Pagada" : "Pendiente",
    };
    onConfirm(payload, { paymentTerms, paymentMethod, total, amountPaid: received });
  };

  if (!doc) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cobrar {doc.type} {doc.number || ""}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 max-h-[65vh] overflow-y-auto">
          <div>
            <Label className="mb-1 block">Items y descuentos por línea</Label>
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium">Item</th>
                    <th className="px-2 py-2 text-right font-medium">Cant.</th>
                    <th className="px-2 py-2 text-right font-medium">Precio</th>
                    <th className="px-2 py-2 text-center font-medium">Dto. línea</th>
                    <th className="px-2 py-2 text-right font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr><td colSpan={5} className="px-2 py-3 text-center text-slate-400">Sin items</td></tr>
                  )}
                  {items.map((it, idx) => (
                    <tr key={idx} className="border-t border-slate-100">
                      <td className="px-2 py-2 text-slate-700">{it.name || "—"}</td>
                      <td className="px-2 py-2 text-right text-slate-600">{it.quantity}</td>
                      <td className="px-2 py-2 text-right text-slate-600">${fmt(it.unit_price)}</td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1 justify-center">
                          <Input type="number" value={it.item_disc} onChange={(e) => setItem(idx, "item_disc", e.target.value)} className="h-7 w-16 text-right" />
                          <Select value={it.item_disc_mode} onValueChange={(v) => setItem(idx, "item_disc_mode", v)}>
                            <SelectTrigger className="h-7 w-20 px-1 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pesos">$</SelectItem>
                              <SelectItem value="porcentaje">%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right font-medium text-slate-800">${fmt(lineSubtotal(it))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 items-end">
            <div>
              <Label>Descuento global</Label>
              <Input type="number" value={discValue} onChange={(e) => setDiscValue(e.target.value)} />
            </div>
            <div>
              <Label>Modo</Label>
              <Select value={discMode} onValueChange={setDiscMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pesos">Pesos ($)</SelectItem>
                  <SelectItem value="porcentaje">Porcentaje (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Dto. aplicado</p>
              <p className="font-semibold text-rose-600">-${fmt(globalDisc)}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-slate-50 rounded-lg p-3 text-sm">
            <div><p className="text-slate-400">Subtotal</p><p className="font-semibold">${fmt(subtotal)}</p></div>
            <div><p className="text-slate-400">IVA</p><p className="font-semibold">${fmt(iva)}</p></div>
            <div className="text-right"><p className="text-slate-400">Total a cobrar</p><p className="font-bold text-lg text-amber-600">${fmt(total)}</p></div>
          </div>

          <div>
            <Label className="mb-1 block">Tipo de pago</Label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setPaymentTerms("Contado")} className={`border rounded-lg p-3 text-left ${paymentTerms === "Contado" ? "border-amber-500 bg-amber-50" : "border-slate-200"}`}>
                <span className="font-medium">Contado</span>
                <span className="block text-xs text-slate-500">Pago inmediato</span>
              </button>
              <button type="button" onClick={() => setPaymentTerms("Crédito")} className={`border rounded-lg p-3 text-left ${paymentTerms === "Crédito" ? "border-amber-500 bg-amber-50" : "border-slate-200"}`}>
                <span className="font-medium">Crédito</span>
                <span className="block text-xs text-slate-500">Pago diferido</span>
              </button>
            </div>
          </div>

          {paymentTerms === "Crédito" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Días de crédito (plazo)</Label>
                <Input type="number" value={creditDays} onChange={(e) => setCreditDays(e.target.value)} />
              </div>
              <div>
                <Label>Vencimiento</Label>
                <Input value={dueDate} readOnly className="bg-slate-50" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Forma de pago</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                  <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="Otros">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Recibido {paymentTerms === "Crédito" && <span className="text-xs text-slate-400 normal-case">(abono)</span>}</Label>
              <Input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder={paymentTerms === "Contado" ? String(total) : "0"} />
            </div>
            <div>
              <Label>Cambio/Vueltas</Label>
              <Input value={paymentTerms === "Contado" ? fmt(change) : 0} readOnly className="bg-slate-50" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirm} className="bg-emerald-600 hover:bg-emerald-700 text-white">Confirmar cobro</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}