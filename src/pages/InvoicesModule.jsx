// Facturación
import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Receipt, Plus, Search, Trash2, Pencil } from "lucide-react";
import ExportImport from "@/components/ExportImport";
import moment from "moment";

const DOC_TYPES = ["Factura de venta", "Cotización", "Proforma", "Nota crédito", "Recibo de pago", "Comprobante de abono", "Factura de taller"];

export default function Invoices() {
  const [list, setList] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_id: "", customer_name: "", type: "Factura de venta", number: "",
    date: moment().format("YYYY-MM-DD"), items: "", subtotal: 0, iva: 0, discount: 0, total: 0, status: "Pendiente",
    payment_terms: "Contado", credit_days: 0, installments: 1, installment_amount: 0, payment_due_date: "",
    amount_paid: 0, change: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        const [inv, cust] = await Promise.all([
          base44.entities.Invoice.list("-date", 200),
          base44.entities.Customer.list("-created_date", 100),
        ]);
        setList(inv);
        setCustomers(cust);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, []);

  const filtered = useMemo(() => list.filter(i => {
    const matchSearch = !search || i.number?.toLowerCase().includes(search.toLowerCase()) || i.customer_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || i.type === filterType;
    const matchStatus = filterStatus === "all" || i.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  }), [list, search, filterType, filterStatus]);

  const openNew = () => {
    setEditing(null);
    setForm({ customer_id: "", customer_name: "", type: "Factura de venta", number: "", date: moment().format("YYYY-MM-DD"), items: "", subtotal: 0, iva: 0, discount: 0, total: 0, status: "Pendiente", payment_terms: "Contado", credit_days: 0, installments: 1, installment_amount: 0, payment_due_date: "", amount_paid: 0, change: 0 });
    setModalOpen(true);
  };

  const openEdit = (inv) => {
    setEditing(inv);
    setForm({ ...inv });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.total) return;
    setSaving(true);
    try {
      const dueDate = form.payment_terms === "Crédito" && form.credit_days > 0 ? moment(form.date).add(Number(form.credit_days), "days").format("YYYY-MM-DD") : "";
      const inst = Number(form.installments) || 1;
      const instAmt = form.payment_terms === "Crédito" && inst > 0 ? Math.ceil(Number(form.total) / inst) : 0;
      const payload = { ...form, subtotal: Number(form.subtotal), iva: Number(form.iva), discount: Number(form.discount), total: Number(form.total), credit_days: Number(form.credit_days) || 0, installments: inst, installment_amount: instAmt, payment_due_date: dueDate, amount_paid: Number(form.amount_paid) || 0, change: Number(form.change) || 0 };
      if (editing) await base44.entities.Invoice.update(editing.id, payload);
      else await base44.entities.Invoice.create(payload);
      setModalOpen(false);
      const data = await base44.entities.Invoice.list("-date", 200);
      setList(data);
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm("¿Anular este documento?")) return;
    await base44.entities.Invoice.delete(id);
    const data = await base44.entities.Invoice.list("-date", 200);
    setList(data);
  };

  const onCustomerChange = (v) => {
    const c = customers.find(c => c.id === v);
    setForm({ ...form, customer_id: v, customer_name: c?.name || "" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  const statusColors = {
    "Pendiente": "bg-amber-100 text-amber-700",
    "Pagada": "bg-emerald-100 text-emerald-700",
    "Anulada": "bg-red-100 text-red-700",
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Facturación</h1>
          <p className="text-slate-500 mt-1">{list.length} documentos registrados</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportImport entityName="Invoice" fields={["number", "type", "customer_name", "date", "items", "subtotal", "iva", "discount", "total", "status", "payment_terms", "credit_days", "installments", "amount_paid", "change"]} itemFields={["items"]} />
          <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
            <Plus className="w-4 h-4" /> Nuevo Documento
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar por número o cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Pendiente">Pendiente</SelectItem>
            <SelectItem value="Pagada">Pagada</SelectItem>
            <SelectItem value="Anulada">Anulada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No hay documentos registrados</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 font-medium">Número</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-800">{inv.number || "—"}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600">{inv.type}</span></td>
                    <td className="px-4 py-3 text-slate-700">{inv.customer_name || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{inv.date ? moment(inv.date).format("DD/MM/YYYY") : "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">${(inv.total || 0).toLocaleString("es-CO")}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[inv.status]}`}>{inv.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openEdit(inv)} className="p-1.5 text-slate-400 hover:text-amber-600"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => remove(inv.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar documento" : "Nuevo documento"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de documento</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Número</Label>
                <Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="Ej: FAC-001" />
              </div>
            </div>
            <div>
              <Label>Cliente</Label>
              <Select value={form.customer_id} onValueChange={onCustomerChange}>
                <SelectTrigger><SelectValue placeholder="Seleccionar cliente..." /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label>Detalle / Items</Label>
              <Textarea value={form.items} onChange={(e) => setForm({ ...form, items: e.target.value })} rows={3} placeholder="Descripción de los items..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Subtotal</Label>
                <Input type="number" value={form.subtotal} onChange={(e) => setForm({ ...form, subtotal: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>IVA</Label>
                <Input type="number" value={form.iva} onChange={(e) => setForm({ ...form, iva: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Descuento</Label>
                <Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Total</Label>
                <Input type="number" value={form.total} onChange={(e) => setForm({ ...form, total: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                  <SelectItem value="Pagada">Pagada</SelectItem>
                  <SelectItem value="Anulada">Anulada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Recibido (con cuánto pagó)</Label>
                <Input type="number" value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: parseFloat(e.target.value) || 0, change: Math.max(0, (parseFloat(e.target.value) || 0) - Number(form.total)) })} />
              </div>
              <div>
                <Label>Cambio/Vueltas</Label>
                <Input type="number" value={form.change} readOnly className="bg-slate-50" />
              </div>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Plazo de pago</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Plazo</Label>
                  <Select value={form.payment_terms} onValueChange={(v) => setForm({ ...form, payment_terms: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Contado">Contado</SelectItem>
                      <SelectItem value="Crédito">Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.payment_terms === "Crédito" && (
                  <div>
                    <Label>Días de crédito</Label>
                    <Input type="number" value={form.credit_days} onChange={(e) => setForm({ ...form, credit_days: e.target.value })} placeholder="30" />
                  </div>
                )}
              </div>
              {form.payment_terms === "Crédito" && (
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <Label>Número de cuotas</Label>
                    <Input type="number" value={form.installments} onChange={(e) => setForm({ ...form, installments: e.target.value })} min="1" />
                  </div>
                  <div>
                    <Label>Valor por cuota</Label>
                    <Input type="number" value={form.total && form.installments ? Math.ceil(Number(form.total) / (Number(form.installments) || 1)) : ""} readOnly className="bg-slate-50" placeholder="Auto" />
                  </div>
                </div>
              )}
              {form.payment_terms === "Crédito" && form.credit_days > 0 && (
                <p className="text-xs text-slate-500 mt-2">Vence: {moment(form.date).add(Number(form.credit_days), "days").format("DD/MM/YYYY")} · {Number(form.installments) > 1 ? `${form.installments} cuotas` : "Pago único"}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}