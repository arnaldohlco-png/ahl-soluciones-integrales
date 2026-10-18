import React, { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const fmt = (n) => `$${(n || 0).toLocaleString("es-CO")}`;
const norm = (s) => (s || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function LiveItemSearch({ options = [], onSelect, placeholder = "Buscar..." }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const results = useMemo(() => {
    const t = norm(q).trim();
    if (!t) return [];
    const words = t.split(/\s+/);
    return options
      .filter((o) => {
        const hay = norm(`${o.name} ${o.sku || ""} ${o.barcode || ""} ${o.brand || ""} ${o.reference || ""}`);
        return words.every((w) => hay.includes(w));
      })
      .slice(0, 8);
  }, [options, q]);

  const inputRef = useRef(null);
  const pick = (o) => { onSelect(o); setQ(""); setOpen(false); setTimeout(() => inputRef.current?.focus(), 0); };

  return (
    <div className="relative w-full" ref={ref}>
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <Input
        ref={inputRef}
        value={q}
        placeholder={placeholder}
        className="pl-9"
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && q.trim() && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-slate-400 text-center">Sin resultados</p>
          ) : results.map((o) => {
            const det = [o.sku && `SKU: ${o.sku}`, o.brand, o.stock != null && `Stock: ${o.stock}`].filter(Boolean).join(" · ");
            return (
              <button key={o.id} type="button" onClick={() => pick(o)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 border-b border-slate-50 last:border-0">
                <div className="flex justify-between gap-2">
                  <span className="font-medium text-slate-800 truncate">
                    {o._type && (
                      <span className={`mr-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${o._type === "Producto" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
                        {o._type === "Producto" ? "Repuesto" : "Servicio"}
                      </span>
                    )}
                    {o.name}
                  </span>
                  {o.price != null && <span className="text-slate-500 shrink-0">{fmt(o.price)}</span>}
                </div>
                {det && <p className="text-xs text-slate-400 truncate">{det}</p>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}