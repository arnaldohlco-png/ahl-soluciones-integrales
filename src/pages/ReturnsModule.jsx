// Devoluciones
import React, { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { fetchAll } from "@/lib/entityLoader";
import { registerForPayment } from "@/lib/cashRegister";
import { fetchAllCustomers } from "@/lib/customersLoader";
import { fetchAllProducts } from "@/lib/productsLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Undo2, Plus, Search, Trash2, Printer, PackageCheck } from "lucide-react";
import SearchableSelect from "@/components/SearchableSelect";
import PrintableDocument from "@/components/PrintableDocument";
import { getNextDocNumber } from "@/lib/docNumbering";
import { matchAny } from "@/lib/search";
import moment from "moment";
import { useConfirm } from "@/components/ConfirmProvider";

const PAY_METHODS = ["Efectivo", "Transferencia", "Tarjeta", "Otros"];

const parseItems = (str) => {
  try { const p = JSON.parse(str || "[]"); return Array.isArray(p) ? p : []; } catch { return []; }
};

export default function ReturnsModule() {
  const location = useLocation();
  const confirm = useConfirm();
  const [list, setList] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [sales, setSales] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printRet, setPrintRet] = useState(null);

  const [form, setForm] = useState({
    number: "", date: moment().format("YYYY-MM-DD"), customer_id: "", customer_name: "",
    source_type: "Factura", source_id: "", source_number: "",
    reason: "", items: "[]", subtotal: 0, total: 0,
    payment_method: "Efectivo", status: "Aplicada", notes: "",
  });
  // Items de la devolución: [{product_id, name, max_qty, quantity, unit_price, subtotal}]
  const [retItems, setRetItems] = useState([]);
  const [pendingSource, setPendingSource] = useState(null);

  // Documentos cobrados disponibles para devolver
  const sources = useMemo(() => {
    const inv = invoices
      .filter((i) => i.status === "Pagada" && ["Factura de venta", "Factura de taller"].includes(i.type))
      .map((i) => ({ id: i.id, type: "Factura", number: i.number || "—", customer_id: i.customer_id, customer_name: i.customer_name || "—", total: i.total || 0, itemsRaw: i.items, date: i.date }));
    const sls = sales
      .filter((s) => s.status === "Pagada")
      .map((s) => ({ id: s.id, type: "Venta POS", number: s.number || "—", customer_id: s.customer_id, customer_name: s.customer_name || "—", total: s.total || 0, itemsRaw: s.items, date: s.date }));
    return [...inv, ...sls];
  }, [invoices, sales]);

  useEffect(() => {
    (async () => {
      try {
        const [rets, cust, prods, inv, sls, comp] = await Promise.all([
          fetchAll("Return"),
          fetchAllCustomers(),
          fetchAllProducts(),
          fetchAll("Invoice"),
          fetchAll("Sale"),
          base44.entities.Company.list("-created_date", 1),
        ]);
        setList(rets);
        setCustomers(cust);
        setProducts(prods);
        setInvoices(inv);
        setSales(sls);
        if (comp.length > 0) setCompany(comp[0]);
        // Si llegó desde una factura cobrada, abrir diálogo y marcar origen pendiente
        const st = location.state;
        if (st && st.sourceId) {
          openNew();
          setPendingSource({ id: st.sourceId, type: st.sourceType || "Factura" });
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => list.filter((r) => matchAny(search, r.number, r.customer_name, r.source_number)), [list, search]);

  // Auto-seleccionar el documento de origen cuando ya están cargados los sources
  useEffect(() => {
    if (!pendingSource) return;
    const src = sources.find((s) => s.id === pendingSource.id && s.type === pendingSource.type);
    if (src) { selectSource(src.id, src.type); setPendingSource(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources, pendingSource]);

  const recalc = (items) => {
    const subtotal = items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
    setForm((f) => ({ ...f, items: JSON.stringify(items), subtotal, total: subtotal }));
  };

  const selectSource = (id, type) => {
    const src = sources.find((s) => s.id === id && s.type === type);
    if (!src) return;
    const parsed = parseItems(src.itemsRaw);
    const items = parsed.map((it) => ({
      product_id: it.product_id || "",
      name: it.name || "—",
      max_qty: Number(it.quantity) || 0,
      quantity: 0,
      unit_price: Number(it.unit_price) || 0,
      subtotal: 0,
    }));
    setRetItems(items);
    setForm((f) => ({
      ...f, source_type: type, source_id: src.id, source_number: src.number,
      customer_id: src.customer_id, customer_name: src.customer_name,
      items: JSON.stringify([]), subtotal: 0, total: 0,
    }));
    recalc(items.map((i) => ({ ...i, quantity: 0, subtotal: 0 })));
  };

  const openNew = () => {
    setForm({ number: "", date: moment().format("YYYY-MM-DD"), customer_id: "", customer_name: "", source_type: "Factura", source_id: "", source_number: "", reason: "", items: "[]", subtotal: 0, total: 0, payment_method: "Efectivo", status: "Aplicada", notes: "" });
    setRetItems([]);
    setModalOpen(true);
  };

  const setQty = (idx, qty) => {
    const next = [...retItems];
    const max = next[idx].max_qty;
    const q = Math.max(0, Math.min(Number(qty) || 0, max));
    next[idx] = { ...next[idx], quantity: q, subtotal: q * next[idx].unit_price };
    setRetItems(next);
    recalc(next);
  };

  const save = async () => {
    const returned = retItems.filter((i) => i.quantity > 0);
    if (!form.source_id) { alert("Selecciona un documento cobrado de origen"); return; }
    if (returned.length === 0) { alert("Indica la cantidad a devolver de al menos un producto"); return; }
    if (!form.reason.trim()) { alert("Indica el motivo de la devolución"); return; }
    setSaving(true);
    try {
      const number = await getNextDocNumber("Return", "DEV");
      const itemsPayload = returned.map((i) => ({ product_id: i.product_id, name: i.name, quantity: i.quantity, unit_price: i.unit_price, subtotal: i.subtotal }));
      const payload = { ...form, number, items: JSON.stringify(itemsPayload), subtotal: form.subtotal, total: form.total };
      const created = await base44.entities.Return.create(payload);

      // Restock: devolver productos al inventario
      await Promise.all(returned
        .filter((i) => i.product_id)
        .map((i) => {
          const prod = products.find((p) => p.id === i.product_id);
          const newStock = (prod?.stock || 0) + i.quantity;
          return base44.entities.Product.update(i.product_id, { stock: newStock });
        })
      );

      // Movimiento de caja (salida) por el reembolso
      await base44.entities.CashMovement.create({
        date: new Date().toISOString(), type: "Salida", category: "Otro egreso",
        amount: form.total,
        description: `Devolución ${number} - ${form.source_type} ${form.source_number} - ${form.customer_name || ""}`.trim(),
        payment_method: form.payment_method, register_type: registerForPayment(form.payment_method, "Caja principal"), reference_id: created.id,
      });

      setModalOpen(false);
      const data = await fetchAll("Return");
      setList(data);
      // refrescar stock local
      const prods = await fetchAllProducts();
      setProducts(prods);
    } catch (e) { console.error(e); alert("Error al registrar la devolución"); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!(await confirm({ title: "¿Anular esta devolución?", description: "El stock NO se revertirá automáticamente.", confirmText: "Sí, anular", cancelText: "No", variant: "destructive" }))) return;
    await base44.entities.Return.update(id, { status: "Anulada" });
    const data = await fetchAll("Return");
    setList(data);
  };

  const del = async (id) => {
    if (!(await confirm({ title: "¿Eliminar definitivamente esta devolución?", description: "El stock NO se revertirá.", confirmText: "Sí, eliminar", cancelText: "No", variant: "destructive" }))) return;
    await base44.entities.Return.delete(id);
    const data = await fetchAll("Return");
    setList(data);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  const statusColors = { "Aplicada": "bg-emerald-100 text-emerald-700", "Anulada": "bg-red-100 text-red-700" };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Devoluciones</h1>
          <p className="text-slate-500 mt-1">{list.length} devoluciones registradas</p>
        </div>
        <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
          <Plus className="w-4 h-4" /> Nueva Devolución
        </Button>
      </div>

      <div className="flex items-start gap-2 mb-5 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl px-4 py-3 text-sm">
        <PackageCheck className="w-4 h-4 mt-0.5 shrink-0" />
        <p>Solo se pueden devolver documentos ya cobrados (facturas pagadas o ventas POS). Los productos devueltos se cargan automáticamente al inventario.</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Buscar por número, cliente u documento origen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Undo2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No hay devoluciones registradas</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 font-medium">Número</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Origen</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.number || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.date ? moment(r.date).format("DD/MM/YYYY") : "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{r.customer_name || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{r.source_type} {r.source_number || ""}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">${(r.total || 0).toLocaleString("es-CO")}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[r.status]}`}>{r.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => setPrintRet(r)} title="Imprimir" className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded"><Printer className="w-4 h-4" /></button>
                        {r.status === "Aplicada" && (
                          <button onClick={() => remove(r.id)} title="Anular" className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded"><Undo2 className="w-4 h-4" /></button>
                        )}
                        <button onClick={() => del(r.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva Devolución</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <Label>Número</Label>
                <Input value="Se genera automáticamente" readOnly className="bg-slate-50" />
              </div>
            </div>

            <div>
              <Label>Documento cobrado de origen</Label>
              <SearchableSelect
                placeholder="Buscar documento cobrado..."
                value={form.source_id ? `${form.source_type}|${form.source_id}` : ""}
                onValueChange={(v) => { const [type, id] = v.split("|"); selectSource(id, type); }}
                items={sources.map((s) => ({ id: `${s.type}|${s.id}`, label: `${s.type} ${s.number}`, sublabel: `${s.customer_name} · $${(s.total || 0).toLocaleString("es-CO")}` }))}
              />
              {form.source_id && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                <span>Cliente: <strong>{form.customer_name || "—"}</strong></span>
                <span>Origen: <strong>{form.source_type} {form.source_number}</strong></span>
              </div>
              )}
            </div>

            {form.source_id && (
              <div>
                <Label>Productos a devolver</Label>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-400 text-xs">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Producto</th>
                        <th className="px-3 py-2 text-right font-medium">Cant. doc.</th>
                        <th className="px-3 py-2 text-right font-medium">Devolver</th>
                        <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {retItems.map((it, idx) => (
                        <tr key={idx} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-700">
                            {it.name}
                            {it.product_id && <span className="ml-1 text-[10px] text-emerald-600">(restock)</span>}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-500">{it.max_qty}</td>
                          <td className="px-3 py-2 text-right">
                            <Input type="number" min="0" max={it.max_qty} value={it.quantity} onChange={(e) => setQty(idx, e.target.value)} className="w-20 h-8 text-right ml-auto" />
                          </td>
                          <td className="px-3 py-2 text-right text-slate-700">${(it.subtotal || 0).toLocaleString("es-CO")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div>
              <Label>Motivo de la devolución</Label>
              <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} placeholder="Ej: Producto defectuoso, devolución del cliente, error de venta..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Medio de devolución</Label>
                <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAY_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Total devolución</Label>
                <Input type="number" value={form.total} readOnly className="bg-slate-50" />
              </div>
            </div>

            <div>
              <Label>Notas (opcional)</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              {saving ? "Guardando..." : "Registrar devolución"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {printRet && (
        <PrintableDocument
          type="invoice"
          doc={{ ...printRet, type: "Nota crédito", number: printRet.number }}
          company={company}
          extras={{ customer: customers.find((c) => c.id === printRet.customer_id) }}
          onClose={() => setPrintRet(null)}
        />
      )}
    </div>
  );
}