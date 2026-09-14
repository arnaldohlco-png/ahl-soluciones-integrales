import React, { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus } from "lucide-react";
import ProductQuickForm from "@/components/ProductQuickForm";

const fmt = (n) => `$${(n || 0).toLocaleString("es-CO")}`;

/**
 * Botón de búsqueda reutilizable para seleccionar items de un catálogo
 * (productos o servicios). Abre un dropdown con campo de búsqueda y lista filtrada.
 * Uso en todos los formularios actuales y futuros que requieran seleccionar
 * productos o servicios desde un catálogo.
 *
 * props:
 * - options: array de { id, name, price?, sku?, barcode?, brand? }
 * - onSelect: (item) => void
 * - label: texto del botón
 * - placeholder: placeholder del campo de búsqueda
 * - buttonClass: clases extra para el botón
 * - showPrice: mostrar el precio en la lista (default true)
 */
export default function CatalogPicker({ options = [], onSelect, label = "Buscar", placeholder = "Buscar...", buttonClass = "", showPrice = true, allowCreate = false, onProductCreated, suppliers }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    if (!term) return options;
    return options.filter((o) =>
      (o.name || "").toLowerCase().includes(term) ||
      (o.sku || "").toLowerCase().includes(term) ||
      (o.barcode || "").includes(term) ||
      (o.brand || "").toLowerCase().includes(term)
    );
  }, [options, q]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const handleSelect = (item) => {
    onSelect(item);
    setQ("");
    setOpen(false);
  };

  const handleCreated = (created) => {
    onProductCreated?.(created);
    setShowCreate(false);
    setQ("");
    setOpen(false);
    onSelect(created);
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" className={`h-7 text-xs ${buttonClass}`} onClick={() => setOpen(true)}>
        <Search className="w-3.5 h-3.5 mr-1" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={placeholder}
              className="h-9 pl-8 text-sm"
            />
          </div>
          <div className="max-h-[55vh] overflow-y-auto rounded-md border border-slate-100">
            {filtered.length === 0 ? (
              <div className="py-2">
                <p className="text-center text-xs text-slate-400 py-3">Sin resultados</p>
                {allowCreate && q.trim() && (
                  <button
                    type="button"
                    onClick={() => setShowCreate(true)}
                    className="w-full text-left px-3 py-2 text-sm border-t border-slate-100 text-amber-600 hover:bg-amber-50 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Crear producto &ldquo;{q.trim()}&rdquo;</span>
                  </button>
                )}
              </div>
            ) : (
              filtered.slice(0, 50).map((o) => {
                const details = [
                  o.sku && `SKU: ${o.sku}`,
                  o.reference && `Ref: ${o.reference}`,
                  o.brand && `Marca: ${o.brand}`,
                  o.category,
                  o.barcode && `Barras: ${o.barcode}`,
                  o.stock != null && `Stock: ${o.stock}`,
                  o.compatibility && `Compat.: ${o.compatibility}`,
                ].filter(Boolean);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => handleSelect(o)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm border-b border-slate-50 last:border-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-800 font-medium">{o.name}</span>
                      {showPrice && o.price != null && (
                        <span className="text-slate-500 shrink-0">{fmt(o.price)}</span>
                      )}
                    </div>
                    {details.length > 0 && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{details.join(" · ")}</p>
                    )}
                  </button>
                );
              })
            )}
          </div>
          {allowCreate && filtered.length > 0 && q.trim() && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="w-full text-left px-3 py-2 mt-2 text-sm border border-amber-200 rounded-md text-amber-600 hover:bg-amber-50 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear producto &ldquo;{q.trim()}&rdquo;</span>
            </button>
          )}
        </DialogContent>
      </Dialog>

      {showCreate && (
        <ProductQuickForm
          open={showCreate}
          onOpenChange={setShowCreate}
          defaultName={q.trim()}
          suppliers={suppliers}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}