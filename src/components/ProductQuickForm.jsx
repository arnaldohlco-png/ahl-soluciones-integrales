import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { fetchAll } from "@/lib/entityLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

const categories = ["Repuestos", "Accesorios", "Lubricantes", "Llantas", "Baterías", "Consumibles", "Herramientas", "Indumentaria", "Otros"];

const empty = {
  name: "", category: "Repuestos", brand: "", sku: "", barcode: "", reference: "",
  compatibility: "", price: "", cost: "", iva_rate: "19", stock: "", min_stock: "5",
  location: "", supplier_id: "", description: "",
};

/**
 * Formulario de creación rápida de producto (al vuelo).
 * Todos los campos opcionales salvo nombre y precio.
 * props:
 * - open, onOpenChange
 * - defaultName: término de búsqueda que se precarga en el nombre
 * - suppliers: lista de proveedores (opcional; se cargan solos si no se pasa)
 * - onCreated: (product) => void  — se llama con el producto recién creado
 */
export default function ProductQuickForm({ open, onOpenChange, defaultName = "", suppliers: suppliersProp, onCreated }) {
  const [form, setForm] = useState(empty);
  const [suppliers, setSuppliers] = useState(suppliersProp || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ ...empty, name: defaultName || "" });
      if (suppliersProp && suppliersProp.length > 0) {
        setSuppliers(suppliersProp);
      } else {
        fetchAll("Supplier").then(setSuppliers).catch(() => {});
      }
    }
  }, [open, defaultName, suppliersProp]);

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
      const created = await base44.entities.Product.create(payload);
      onCreated?.(created);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      alert("Error al crear el producto: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear producto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
          <div>
            <Label>Nombre del producto <span className="text-red-500">*</span></Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
          </div>
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
            <div><Label>Precio de venta <span className="text-red-500">*</span></Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1" /></div>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.name.trim() || form.price === ""} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? "Creando..." : "Crear y agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}