import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Package, Search, AlertTriangle, MapPin, Barcode, TrendingUp } from "lucide-react";
import ExportImport from "@/components/ExportImport";

const categories = ["Repuestos", "Accesorios", "Lubricantes", "Llantas", "Baterías", "Consumibles", "Herramientas", "Indumentaria", "Otros"];

const empty = {
  name: "", category: "Repuestos", brand: "", sku: "", barcode: "", reference: "",
  compatibility: "", price: "", cost: "", iva_rate: "19", stock: "", min_stock: "5",
  location: "", supplier_id: "", description: "",
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        base44.entities.Product.list("-created_date", 300),
        base44.entities.Supplier.list("-created_date", 100),
      ]);
      setProducts(p); setSuppliers(s);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const supplierName = (id) => suppliers.find((s) => s.id === id)?.name || "";

  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const openEdit = (p) => {
    setForm({
      name: p.name || "", category: p.category || "Repuestos", brand: p.brand || "",
      sku: p.sku || "", barcode: p.barcode || "", reference: p.reference || "",
      compatibility: p.compatibility || "", price: p.price ?? "", cost: p.cost ?? "",
      iva_rate: p.iva_rate ?? "19", stock: p.stock ?? "", min_stock: p.min_stock ?? "5",
      location: p.location || "", supplier_id: p.supplier_id || "", description: p.description || "",
    });
    setEditing(p); setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || form.price === "") return;
    setSaving(true);
    const payload = {
      ...form,
      price: Number(form.price) || 0,
      cost: Number(form.cost) || 0,
      iva_rate: Number(form.iva_rate) || 0,
      stock: Number(form.stock) || 0,
      min_stock: Number(form.min_stock) || 5,
    };
    try {
      if (editing) { await base44.entities.Product.update(editing.id, payload); }
      else { await base44.entities.Product.create(payload); }
      setOpen(false); await load();
    } catch (e) { console.error(e); alert("Error al guardar"); }
    setSaving(false);
  };

  const remove = async (p) => {
    if (!confirm(`¿Eliminar "${p.name}"?`)) return;
    await base44.entities.Product.delete(p.id);
    await load();
  };

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.brand?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.includes(search);
    const matchCat = filterCat === "all" || p.category === filterCat;
    return matchSearch && matchCat;
  });

  const isLow = (p) => (p.stock || 0) <= (p.min_stock || 5);

  const totals = products.reduce((acc, p) => {
    const stock = p.stock || 0;
    const cost = p.cost || 0;
    const price = p.price || 0;
    acc.totalCost += cost * stock;
    acc.totalSale += price * stock;
    acc.margin += (price - cost) * stock;
    return acc;
  }, { totalCost: 0, totalSale: 0, margin: 0 });

  const marginPct = totals.totalSale > 0 ? (totals.margin / totals.totalSale) * 100 : 0;
  const fmt = (n) => `$${n.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Inventario</h1>
          <p className="text-slate-500 mt-1">{products.length} productos en almacén</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ExportImport entityName="Product" columns={[{"header":"Código","field":"sku"},{"header":"Repuesto","field":"name"},{"header":"Categoría","field":"category"},{"header":"Proveedor","field":"supplier_id"},{"header":"Marca","field":"brand"},{"header":"Costo","field":"cost"},{"header":"Precio","field":"price"},{"header":"Existencia","field":"stock"},{"header":"Mínimo","field":"min_stock"}]} lookups={{supplier_id:{entity:"Supplier",labelField:"name",valueField:"id"}}} />
          <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
            <Plus className="w-4 h-4 mr-1" /> Nuevo Producto
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <Package className="w-4 h-4" /> Costo del inventario
          </div>
          <p className="text-xl md:text-2xl font-bold text-slate-900">{fmt(totals.totalCost)}</p>
          <p className="text-xs text-slate-400 mt-1">Valor de los productos en stock</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <Barcode className="w-4 h-4" /> Valor de venta
          </div>
          <p className="text-xl md:text-2xl font-bold text-slate-900">{fmt(totals.totalSale)}</p>
          <p className="text-xs text-slate-400 mt-1">Precio total del inventario</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <TrendingUp className="w-4 h-4" /> Margen de utilidad
          </div>
          <p className="text-xl md:text-2xl font-bold text-emerald-600">{fmt(totals.margin)}</p>
          <p className="text-xs text-slate-400 mt-1">Utilidad bruta · {marginPct.toFixed(1)}%</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Buscar por nombre, marca, SKU o código de barras..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay productos en el inventario</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Producto</th>
                  <th className="px-4 py-3 text-left font-medium">Categoría</th>
                  <th className="px-4 py-3 text-left font-medium">SKU</th>
                  <th className="px-4 py-3 text-right font-medium">Precio</th>
                  <th className="px-4 py-3 text-right font-medium">Costo</th>
                  <th className="px-4 py-3 text-right font-medium">Margen</th>
                  <th className="px-4 py-3 text-center font-medium">Stock</th>
                  <th className="px-4 py-3 text-left font-medium">Ubic.</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{p.name}</p>
                          {p.brand && <p className="text-xs text-slate-400">{p.brand}{p.reference ? ` · Ref: ${p.reference}` : ""}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">{p.category}</span></td>
                    <td className="px-4 py-3 font-mono text-slate-500">{p.sku || "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">${(p.price || 0).toLocaleString("es-CO")}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{p.cost ? `$${p.cost.toLocaleString("es-CO")}` : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {p.cost > 0 ? (
                        <span className="text-emerald-600 font-medium">
                          ${((p.price || 0) - (p.cost || 0)).toLocaleString("es-CO")}
                          <span className="block text-xs text-slate-400 font-normal">{((((p.price || 0) - (p.cost || 0)) / (p.cost || 1)) * 100).toFixed(0)}%</span>
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isLow(p) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-xs font-semibold">
                          <AlertTriangle className="w-3 h-3" /> {p.stock}
                        </span>
                      ) : (
                        <span className="text-slate-700 font-medium">{p.stock}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{p.location || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => remove(p)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar Producto" : "Nuevo Producto"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <div><Label>Nombre del producto *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoría</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Marca</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>SKU / Código</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="mt-1" /></div>
              <div><Label>Código de barras</Label><Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Referencia</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="mt-1" /></div>
              <div><Label>IVA (%)</Label><Input type="number" value={form.iva_rate} onChange={(e) => setForm({ ...form, iva_rate: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Precio de venta *</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1" /></div>
              <div><Label>Costo</Label><Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="mt-1" /></div>
              <div><Label>Stock mínimo</Label><Input type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Ubicación</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="mt-1" placeholder="Estante, bodega..." /></div>
              <div>
                <Label>Proveedor</Label>
                <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Sin proveedor" /></SelectTrigger>
                  <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Compatibilidad</Label><Input value={form.compatibility} onChange={(e) => setForm({ ...form, compatibility: e.target.value })} className="mt-1" placeholder="Ej: Honda CB190, Yamaha YBR125..." /></div>
            <div><Label>Descripción</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.name.trim() || form.price === ""} className="bg-amber-500 hover:bg-amber-600 text-slate-900">{saving ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}