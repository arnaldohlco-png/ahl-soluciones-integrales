import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import nowLocalISO from "@/lib/localDate";
import { saleMovementsInWindow, loadSalesByIds, voidReversalDescription } from "@/lib/shiftReport";

const fmt = (n) => `$${(n || 0).toLocaleString("es-CO")}`;

// Registra la anulación de una venta del turno: devuelve el dinero en caja, restituye stock y guarda quién autorizó.
export default function VoidSaleDialog({ open, onOpenChange, list, register, turno, voids, userName, onDone }) {
  const [sales, setSales] = useState([]);
  const [saleId, setSaleId] = useState("");
  const [reason, setReason] = useState("");
  const [authorizedBy, setAuthorizedBy] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSaleId(""); setReason(""); setAuthorizedBy("");
    const voided = new Set(voids.map((v) => v.sale_id));
    const ids = [...new Set(saleMovementsInWindow(list, turno.openDate, null).map((m) => m.reference_id))].filter((id) => !voided.has(id));
    loadSalesByIds(ids).then(setSales);
  }, [open]);

  const sale = sales.find((s) => s.id === saleId);

  const save = async () => {
    if (!sale || !authorizedBy.trim()) return;
    setSaving(true);
    const movs = saleMovementsInWindow(list, turno.openDate, null).filter((m) => m.reference_id === sale.id);
    await base44.entities.SaleVoid.create({
      date: nowLocalISO(), register_type: register, sale_id: sale.id, sale_number: sale.number || "",
      amount: sale.total || 0, reason: reason.trim(), authorized_by: authorizedBy.trim(), registered_by: userName || "",
    });
    await base44.entities.CashMovement.bulkCreate(movs.map((m) => ({
      date: nowLocalISO(), type: "Salida", category: "Otro egreso", amount: m.amount, payment_method: m.payment_method,
      register_type: m.register_type, bank_account: m.bank_account || undefined,
      description: voidReversalDescription(sale.number), reference_id: `VOID-${sale.id}`,
    })));
    let items = [];
    try { items = JSON.parse(sale.items || "[]"); } catch (_) { /* ignore */ }
    for (const it of items.filter((i) => i.product_id)) {
      const p = await base44.entities.Product.get(it.product_id);
      if (p) await base44.entities.Product.update(p.id, { stock: (p.stock || 0) + (Number(it.quantity) || 0) });
    }
    setSaving(false);
    onOpenChange(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anular venta del turno</DialogTitle>
          <DialogDescription>Se devuelve el dinero de la caja, se restituye el stock y queda registrado quién autorizó.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Venta *</Label>
            <Select value={saleId} onValueChange={setSaleId}>
              <SelectTrigger><SelectValue placeholder={sales.length ? "Selecciona la venta" : "Sin ventas por anular"} /></SelectTrigger>
              <SelectContent>
                {sales.map((s) => <SelectItem key={s.id} value={s.id}>{s.number || "Venta"} · {s.customer_name || "—"} · {fmt(s.total)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Autorizado por *</Label>
            <Input value={authorizedBy} onChange={(e) => setAuthorizedBy(e.target.value)} placeholder="Nombre de quien autoriza" />
          </div>
          <div>
            <Label>Motivo</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !sale || !authorizedBy.trim()} className="bg-red-600 hover:bg-red-700 text-white">
            {saving ? "Anulando..." : "Anular venta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}