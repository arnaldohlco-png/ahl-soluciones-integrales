import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import CatalogPicker from "@/components/CatalogPicker";

export default function ServiceItemsEditor({ items, setItems, products, services, allowCreateProduct = true, onProductCreated, suppliers }) {
  const [newItem, setNewItem] = useState({ type: "Servicio", name: "", quantity: 1, unit_price: 0 });

  const addItem = () => {
    if (!newItem.name.trim()) return;
    const subtotal = (Number(newItem.quantity) || 1) * (Number(newItem.unit_price) || 0);
    setItems([...items, { ...newItem, quantity: Number(newItem.quantity) || 1, unit_price: Number(newItem.unit_price) || 0, subtotal }]);
    setNewItem({ type: "Servicio", name: "", quantity: 1, unit_price: 0 });
  };

  const removeItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx, field, value) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === "quantity" || field === "unit_price") {
      updated[idx].subtotal = (Number(updated[idx].quantity) || 0) * (Number(updated[idx].unit_price) || 0);
    }
    setItems(updated);
  };

  const onProductSelect = (p) => {
    setNewItem({ type: "Producto", name: p.name, quantity: 1, unit_price: p.price || 0, product_id: p.id });
  };

  const onServiceSelect = (s) => {
    setNewItem({ type: "Servicio", name: s.name, quantity: 1, unit_price: s.price || 0, service_id: s.id });
  };

  const total = items.reduce((s, i) => s + (i.subtotal || 0), 0);

  return (
    <div className="space-y-3">
      {/* Add new item row */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="w-28">
          <Select value={newItem.type} onValueChange={(v) => setNewItem({ ...newItem, type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Servicio">Servicio</SelectItem>
              <SelectItem value="Producto">Producto</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {newItem.type === "Producto" && products?.length > 0 ? (
          <div className="flex-1 min-w-[150px] flex items-center">
            <CatalogPicker options={products} onSelect={onProductSelect} label="Buscar producto" placeholder="Buscar producto..." buttonClass="w-full justify-start" allowCreate={allowCreateProduct} onProductCreated={onProductCreated} suppliers={suppliers} />
          </div>
        ) : newItem.type === "Servicio" && services?.length > 0 ? (
          <div className="flex-1 min-w-[150px] flex items-center">
            <CatalogPicker options={services} onSelect={onServiceSelect} label="Buscar servicio" placeholder="Buscar servicio..." buttonClass="w-full justify-start" />
          </div>
        ) : (
          <div className="flex-1 min-w-[150px]">
            <Input placeholder="Descripción del item" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
          </div>
        )}
        <Input type="number" className="w-20" placeholder="Cant." value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} />
        <Input type="number" className="w-28" placeholder="Precio unit." value={newItem.unit_price} onChange={(e) => setNewItem({ ...newItem, unit_price: e.target.value })} />
        <Button type="button" variant="outline" size="sm" onClick={addItem} className="shrink-0"><Plus className="w-4 h-4" /></Button>
      </div>

      {/* Items list */}
      {items.length > 0 && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Tipo</th>
                <th className="px-3 py-2 text-left font-medium">Descripción</th>
                <th className="px-3 py-2 text-center font-medium">Cant.</th>
                <th className="px-3 py-2 text-right font-medium">Precio</th>
                <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${it.type === "Producto" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{it.type}</span>
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    <div>{it.name}</div>
                    {(() => {
                      const prod = it.product_id && products ? products.find((p) => p.id === it.product_id) : null;
                      if (!prod) return null;
                      const det = [
                        prod.sku && `SKU: ${prod.sku}`,
                        prod.reference && `Ref: ${prod.reference}`,
                        prod.brand && `Marca: ${prod.brand}`,
                        prod.category,
                        prod.stock != null && `Stock: ${prod.stock}`,
                        prod.compatibility && `Compat.: ${prod.compatibility}`,
                      ].filter(Boolean);
                      return det.length ? <p className="text-xs text-slate-400 mt-0.5">{det.join(" · ")}</p> : null;
                    })()}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input type="number" value={it.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} className="w-16 text-center border border-slate-200 rounded px-1 py-0.5" />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input type="number" value={it.unit_price} onChange={(e) => updateItem(i, "unit_price", Number(e.target.value))} className="w-24 text-right border border-slate-200 rounded px-1 py-0.5" />
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">${(it.subtotal || 0).toLocaleString("es-CO")}</td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => removeItem(i)} className="p-1 text-slate-400 hover:text-red-600 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td colSpan={4} className="px-3 py-2 text-right font-medium text-slate-600">Total items:</td>
                <td className="px-3 py-2 text-right font-bold text-slate-900">${total.toLocaleString("es-CO")}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}