import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Bike, Tag } from "lucide-react";

const esc = (s) => s.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const money = (n) => "$" + Math.round(n || 0).toLocaleString("es-CO");

export default function PriceViewer() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [line, setLine] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== "v") return;
      const ae = document.activeElement;
      const typing = ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable);
      if (typing) return; // permite pegar texto normalmente
      e.preventDefault();
      setOpen(true);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-price-viewer", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-price-viewer", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    if (!name.trim() && !line.trim()) { setItems([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const conds = [];
      if (name.trim()) conds.push({ name: { $regex: esc(name), $options: "i" } });
      if (line.trim()) {
        const r = { $regex: esc(line), $options: "i" };
        conds.push({ $or: [{ compatibility: r }, { name: r }] });
      }
      const q = { $and: conds };
      const page = await base44.entities.Product.filter(q, { sort: "name", limit: 60 });
      setItems(page.items || []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [name, line, open]);

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Visor de precios</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input autoFocus className="pl-9" placeholder="Nombre del repuesto" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="relative">
            <Bike className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input className="pl-9" placeholder="Línea de moto" value={line} onChange={(e) => setLine(e.target.value)} />
          </div>
        </div>
        <div className="max-h-[50vh] overflow-y-auto divide-y border rounded-md">
          {loading && <p className="p-4 text-sm text-slate-500">Buscando...</p>}
          {!loading && items.length === 0 && (
            <p className="p-4 text-sm text-slate-500">Escribe un nombre o una línea de moto para consultar precios.</p>
          )}
          {!loading && items.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{p.name}</p>
                <p className="text-xs text-slate-500 truncate">{[p.sku, p.compatibility].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-sm">{money(p.price)}</p>
                <p className="text-xs text-slate-500">Stock: {p.stock ?? 0}</p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}