import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";
import { useConfirm } from "@/components/ConfirmProvider";

// categories: [{id, name}] ; onChanged: recarga categorías
export default function ExpenseCategoriesManager({ open, onOpenChange, categories, onChanged }) {
  const confirm = useConfirm();
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");

  const exists = (n, exceptId) => categories.some((c) => c.id !== exceptId && c.name.toLowerCase() === n.toLowerCase());

  const add = async () => {
    const n = newName.trim();
    if (!n) return;
    if (exists(n)) { alert("Esa categoría ya existe."); return; }
    await base44.entities.ExpenseCategory.create({ name: n });
    setNewName("");
    await onChanged();
  };

  const saveEdit = async (c) => {
    const n = editName.trim();
    if (!n) return;
    if (n === c.name) { setEditId(null); return; }
    if (exists(n, c.id)) { alert("Esa categoría ya existe."); return; }
    await base44.entities.ExpenseCategory.update(c.id, { name: n });
    // Mantener los gastos existentes con la categoría renombrada
    await base44.entities.Expense.updateMany({ category: c.name }, { $set: { category: n } });
    setEditId(null);
    await onChanged();
  };

  const remove = async (c) => {
    if (!(await confirm({ title: `¿Eliminar la categoría "${c.name}"?`, description: "Los gastos ya registrados con esta categoría conservarán su nombre.", confirmText: "Sí, eliminar", cancelText: "No", variant: "destructive" }))) return;
    await base44.entities.ExpenseCategory.delete(c.id);
    await onChanged();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Categorías de gastos</DialogTitle></DialogHeader>
        <div className="flex gap-2">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nueva categoría" onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
          <Button onClick={add} className="bg-amber-500 hover:bg-amber-600 text-slate-900 shrink-0"><Plus className="w-4 h-4" /> Agregar</Button>
        </div>
        <ul className="space-y-1 max-h-[50vh] overflow-y-auto">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-2 border border-slate-100 rounded-lg px-2 py-1.5">
              {editId === c.id ? (
                <>
                  <Input className="h-8" value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveEdit(c); }} />
                  <button onClick={() => saveEdit(c)} className="p-1.5 text-emerald-600"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setEditId(null)} className="p-1.5 text-slate-400"><X className="w-4 h-4" /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-slate-800">{c.name}</span>
                  <button onClick={() => { setEditId(c.id); setEditName(c.name); }} className="p-1.5 text-slate-400 hover:text-amber-600"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(c)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </>
              )}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}