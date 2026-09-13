import React, { useState, useMemo, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const fmt = (n) => `$${(n || 0).toLocaleString("es-CO")}`;

/**
 * Buscador de productos en línea (sin diálogo anidado) para usarse dentro
 * de modales. La lista de resultados se renderiza con un portal al body
 * para que el overflow del modal no la recorte.
 *
 * props:
 * - options: array de { id, name, price?, sku?, barcode?, brand?, stock? }
 * - onSelect: (item) => void
 * - placeholder: texto del campo
 */
export default function InlineProductSearch({ options = [], onSelect, placeholder = "Buscar producto..." }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    if (!term) return [];
    return options.filter((o) =>
      (o.name || "").toLowerCase().includes(term) ||
      (o.sku || "").toLowerCase().includes(term) ||
      (o.barcode || "").includes(term) ||
      (o.brand || "").toLowerCase().includes(term)
    ).slice(0, 12);
  }, [options, q]);

  const updateCoords = () => {
    if (!inputRef.current) return;
    const r = inputRef.current.getBoundingClientRect();
    setCoords({ top: r.bottom + 4, left: r.left, width: r.width });
  };

  useLayoutEffect(() => {
    if (open) updateCoords();
  }, [open, q]);

  useEffect(() => {
    if (!open) return;
    const handle = () => updateCoords();
    window.addEventListener("scroll", handle, true);
    window.addEventListener("resize", handle);
    return () => {
      window.removeEventListener("scroll", handle, true);
      window.removeEventListener("resize", handle);
    };
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (item) => {
    onSelect(item);
    setQ("");
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <Input
        ref={inputRef}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="pl-9"
      />
      {open && q.trim() && createPortal(
        <div
          style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width }}
          className="z-[100] bg-white border border-slate-200 rounded-md shadow-lg max-h-72 overflow-y-auto"
        >
          {filtered.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-4">Sin resultados</p>
          ) : filtered.map((o) => {
            const details = [
              o.sku && `SKU: ${o.sku}`,
              o.reference && `Ref: ${o.reference}`,
              o.brand && `Marca: ${o.brand}`,
              o.category,
              o.stock != null && `Stock: ${o.stock}`,
            ].filter(Boolean);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => handleSelect(o)}
                className="w-full text-left px-3 py-2 hover:bg-amber-50 text-sm border-b border-slate-50 last:border-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-800 font-medium">{o.name}</span>
                  {o.price != null && (
                    <span className="text-slate-500 shrink-0">{fmt(o.price)}</span>
                  )}
                </div>
                {details.length > 0 && (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{details.join(" · ")}</p>
                )}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}