import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Selector con búsqueda por texto.
 * props:
 *  - label: etiqueta del campo
 *  - placeholder: texto del input de búsqueda
 *  - value: id seleccionado
 *  - onValueChange: (id, item) => void
 *  - items: [{ id, label, sublabel? }]
 *  - required
 *  - onCreate: (nombre) => Promise<{id,label,sublabel?}>  // crea un nuevo ítem al vuelo
 *  - createLabel: texto del botón crear (default "Crear")
 */
export default function SearchableSelect({
  label,
  placeholder = "Buscar...",
  value,
  onValueChange,
  items = [],
  required,
  emptyText = "Sin resultados",
  onCreate,
  createLabel = "Crear",
  hideUntilSearch = false,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const ref = useRef(null);
  const inputRef = useRef(null);

  const canCreate = typeof onCreate === "function";

  const selected = items.find((i) => i.id === value);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const normalized = (s) => (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const filtered = useMemo(() => {
    if (!query.trim()) return hideUntilSearch ? [] : items;
    const q = normalized(query);
    return items.filter((i) =>
      normalized(`${i.label} ${i.sublabel || ""}`).includes(q)
    );
  }, [query, items, hideUntilSearch]);

  const showDisplay = !open && selected;

  const handleCreate = async () => {
    const name = query.trim();
    if (!name || !canCreate || creating) return;
    setCreating(true);
    try {
      const created = await onCreate(name);
      if (created && created.id) {
        onValueChange(created.id, created);
        setOpen(false);
        setQuery("");
      }
    } catch (e) { console.error(e); }
    setCreating(false);
  };

  return (
    <div>
      {label && (
        <Label>
          {label}{required && <span className="text-red-500"> *</span>}
        </Label>
      )}
      <div className="relative mt-1" ref={ref}>
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
        <Input
          ref={inputRef}
          value={showDisplay ? selected.label : query}
          placeholder={open ? placeholder : (selected ? selected.label : placeholder)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); setQuery(""); }}
          className="pl-9"
        />
        {open && !(hideUntilSearch && !query.trim() && !canCreate) && (
          <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-slate-400 text-center">{emptyText}</p>
            ) : (
              filtered.map((i) => (
                <button
                  type="button"
                  key={i.id}
                  onClick={() => {
                    onValueChange(i.id, i);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-amber-50 border-b border-slate-50 last:border-0 flex flex-col",
                    i.id === value && "bg-amber-50"
                  )}
                >
                  <span className="font-medium text-slate-800 truncate">{i.label}</span>
                  {i.sublabel && <span className="text-xs text-slate-400 truncate">{i.sublabel}</span>}
                </button>
              ))
            )}
            {canCreate && (
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating || !query.trim()}
                className="w-full text-left px-3 py-2 text-sm border-t border-slate-100 text-amber-600 hover:bg-amber-50 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed sticky bottom-0 bg-white"
              >
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{query.trim() ? `${createLabel} "${query.trim()}"` : `${createLabel} (escribe un nombre)`}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}