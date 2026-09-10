import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Plus, Trash2, FileCheck, Loader2, Pencil, Printer, MessageCircle } from "lucide-react";
import moment from "moment";
import { getNextDocNumber, getPrefix } from "@/lib/docNumbering";
import WhatsAppButton from "@/components/WhatsAppButton";
import PrintableDocument from "@/components/PrintableDocument";
import { buildDocMessage } from "@/lib/docMessages";

const fmt = (n) => `$${(n || 0).toLocaleString("es-CO")}`;

export default function Quotations() {
  const [quotes, setQuotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ customer_id: "", date: moment().format("YYYY-MM-DD") });
  const [items, setItems] = useState([]);
  const [printQ, setPrintQ] = useState(null);

  const customerPhone = (id) => { const c = customers.find((x) => x.id === id); return c?.whatsapp || c?.phone || ""; };

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [q, c, p, comps] = await Promise.all([
        base44.entities.Invoice.filter({ type: "Cotización" }, "-created_date", 200),
        base44.entities.Customer.list("-created_date", 200),
        base44.entities.Product.list("-created_date", 200),
        base44.entities.Company.list("-created_date", 1),
      ]);
      setQuotes(q); setCustomers(c); setProducts(p);
      if (comps.length > 0) setCompany(comps[0]);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const custName = (id) => customers.find((c) => c.id === id)?.name || "—";

  const openNew = () => {
    setEditing(null);
    setForm({ customer_id: "", date: moment().format("YYYY-MM-DD") });
    setItems([]);
    setModalOpen(true);
  };

  const openEdit = (q) => {
    setEditing(q);
    let parsedItems = [];
    try { parsedItems = JSON.parse(q.items || "[]"); } catch { parsedItems = []; }
    setItems(parsedItems);
    setForm({ customer_id: q.customer_id || "", date: q.date ? moment(q.date).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD") });
    setModalOpen(true);
  };

  const addItem = (productId) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    setItems([...items, { name: p.name, quantity: 1, unit_price: p.price || 0, subtotal: p.price || 0, product_id: productId }]);
  };

  const addService = () => {
    setItems([...items, { name: "", quantity: 1, unit_price: 0, subtotal: 0 }]);
  };

  const updateItem = (idx, field, value) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    updated[idx].subtotal = (Number(updated[idx].quantity) || 0) * (Number(updated[idx].unit_price) || 0);
    setItems(updated);
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const subtotal = items.reduce((s, i) => s + (i.subtotal || 0), 0);
  const iva = Math.round(subtotal * 0.19);
  const total = subtotal + iva;

  const save = async () => {
    if (!form.customer_id || items.length === 0) return;
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.Invoice.update(editing.id, {
          customer_id: form.customer_id, customer_name: custName(form.customer_id),
          date: form.date, items: JSON.stringify(items),
          subtotal, iva, discount: 0, total,
        });
      } else {
        await base44.entities.Invoice.create({
          customer_id: form.customer_id, customer_name: custName(form.customer_id),
          type: "Cotización", number: await getNextDocNumber("Invoice", getPrefix(company, "quote")),
          date: form.date, items: JSON.stringify(items),
          subtotal, iva, discount: 0, total, status: "Pendiente",
          payment_terms: "Contado",
        });
      }
      setModalOpen(false); await load();
    } catch (e) { console.error(e); alert("Error al guardar cotización"); }
    setSaving(false);
  };

  const convertToInvoice = async (q) => {
    if (!confirm("¿Convertir esta cotización en factura de venta?")) return;
    try {
      await base44.entities.Invoice.update(q.id, {
        type: "Factura de venta", status: "Pendiente",
        number: await getNextDocNumber("Invoice", getPrefix(company, "invoice")),
      });
      await load();
      alert("Cotización convertida en factura");
    } catch (e) { console.error(e); alert("Error al convertir"); }
  };

  const remove = async (id) => {
    if (!confirm("¿Eliminar esta cotización?")) return;
    await base44.entities.Invoice.delete(id);
    await load();
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center">
            <FileText className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Cotizaciones</h1>
            <p className="text-slate-500 mt-0.5">{quotes.length} cotizaciones registradas</p>
          </div>
        </div>
        <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
          <Plus className="w-4 h-4 mr-1" /> Nueva Cotización
        </Button>
      </div>

      {quotes.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No hay cotizaciones registradas</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quotes.map((q) => {
            const parsed = (() => { try { return JSON.parse(q.items || "[]"); } catch { return []; } })();
            return (
              <div key={q.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-slate-900">{q.number}</p>
                    <p className="text-sm text-slate-500">{q.customer_name || custName(q.customer_id)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{moment(q.date).format("DD/MM/YYYY")}</p>
                  </div>
                  <span className="px-2 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700">{q.status}</span>
                </div>
                <div className="space-y-1 mb-3 text-sm">
                  {parsed.slice(0, 3).map((it, i) => (
                    <div key={i} className="flex justify-between text-slate-600">
                      <span className="truncate">{it.name || "—"} ×{it.quantity}</span>
                      <span>{fmt(it.subtotal)}</span>
                    </div>
                  ))}
                  {parsed.length > 3 && <p className="text-xs text-slate-400">+{parsed.length - 3} items más...</p>}
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2 mb-3">
                  <span className="text-sm text-slate-500">Total</span>
                  <span className="font-bold text-slate-900">{fmt(q.total)}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(q)} className="flex-1">
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => convertToInvoice(q)} className="flex-1">
                    <FileCheck className="w-3.5 h-3.5 mr-1" /> Facturar
                  </Button>
                  <WhatsAppButton size="sm" phone={customerPhone(q.customer_id)} message={buildDocMessage("quotation", q, company, { customer: customers.find((c) => c.id === q.customer_id) })} variant="outline" label="WhatsApp" />
                  <button onClick={() => setPrintQ(q)} title="Imprimir" className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200"><Printer className="w-3.5 h-3.5" /></button>
                  <Button size="sm" variant="ghost" onClick={() => remove(q.id)} className="text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar Cotización" : "Nueva Cotización"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cliente *</Label>
                <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Items</Label>
                <div className="flex gap-2">
                  <Select onValueChange={addItem}>
                    <SelectTrigger className="h-7 text-xs w-auto"><SelectValue placeholder="+ Producto" /></SelectTrigger>
                    <SelectContent>
                      {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — {fmt(p.price)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="sm" variant="outline" onClick={addService} className="h-7 text-xs">+ Servicio</Button>
                </div>
              </div>
              {items.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-lg">Agregue productos o servicios</p>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-2 py-2 text-left font-medium">Descripción</th>
                        <th className="px-2 py-2 text-center font-medium">Cant.</th>
                        <th className="px-2 py-2 text-right font-medium">Precio</th>
                        <th className="px-2 py-2 text-right font-medium">Subtotal</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-2 py-1"><input value={it.name} onChange={(e) => updateItem(i, "name", e.target.value)} className="w-full border-0 px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300 rounded" /></td>
                          <td className="px-2 py-1"><input type="number" value={it.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} className="w-14 text-center border border-slate-200 rounded px-1 py-0.5" /></td>
                          <td className="px-2 py-1"><input type="number" value={it.unit_price} onChange={(e) => updateItem(i, "unit_price", Number(e.target.value))} className="w-24 text-right border border-slate-200 rounded px-1 py-0.5" /></td>
                          <td className="px-2 py-2 text-right font-semibold">{fmt(it.subtotal)}</td>
                          <td className="px-2 py-1 text-right"><button onClick={() => removeItem(i)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-slate-50 rounded-lg p-4 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-slate-600">Subtotal</span><span>{fmt(subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-600">IVA (19%)</span><span>{fmt(iva)}</span></div>
              <div className="flex justify-between font-bold text-lg pt-1 border-t border-slate-200"><span className="text-slate-900">Total</span><span className="text-slate-900">{fmt(total)}</span></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.customer_id || items.length === 0} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {saving ? "Guardando..." : editing ? "Guardar Cambios" : "Crear Cotización"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {printQ && (
        <PrintableDocument
          type="quotation"
          doc={printQ}
          company={company}
          extras={{ customer: customers.find((c) => c.id === printQ.customer_id) }}
          onClose={() => setPrintQ(null)}
        />
      )}
    </div>
  );
}