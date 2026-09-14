import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import ProductQuickForm from "@/components/ProductQuickForm";

const fmt = (n) => `$${(n || 0).toLocaleString("es-CO")}`;

/**
 * Buscador de productos en línea (sin flotantes) para usarse dentro
 * de modales con scroll. La lista de resultados se renderiza en flujo
 * normal (debajo del input), empujando el contenido hacia abajo en lugar
 * de flotar encima, evitando recortes por contenedores con overflow.
 *
 * props:
 * - options: array de { id, name, price?, sku?, barcode?, brand?, stock?, reference?, category?, compatibility?, location? }
 * - onSelect: (item) => void
 * - placeholder: texto del campo
 * - allowCreate: (bool, default true) muestra "Crear producto" cuando no hay resultados
 * - onProductCreated: (product) => void  — refresca la lista del módulo consumidor
 * - suppliers: lista de proveedores (opcional) para el formulario de creación
 */
export default function InlineProductSearch({ options = [], onSelect, placeholder = "Buscar producto...", allowCreate = true, onProductCreated, suppliers }) {
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    if (!term) return [];
    return options.filter((o) =>
      (o.name || "").toLowerCase().includes(term) ||
      (o.sku || "").toLowerCase().includes(term) ||
      (o.barcode || "").includes(term) ||
      (o.brand || "").toLowerCase().includes(term) ||
      (o.reference || "").toLowerCase().includes(term)
    ).slice(0, 12);
  }, [options, q]);

  const handleSelect = (item) => {
    onSelect(item);
    setQ("");
  };

  const handleCreated = (created) => {
    onProductCreated?.(created);
    setShowCreate(false);
    setQ("");
    onSelect(created);
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
      {q.trim() && (
        <div className="mt-1 w-full bg-white border border-slate-200 rounded-md shadow-sm max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-2">
              <p className="text-center text-xs text-slate-400 py-2">Sin resultados</p>
              {allowCreate && (
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
            <>
              {filtered.map((o) => {
                const details = [
                  o.sku && `SKU: ${o.sku}`,
                  o.reference && `Ref: ${o.reference}`,
                  o.brand && `Marca: ${o.brand}`,
                  o.category,
                  o.barcode && `Barras: ${o.barcode}`,
                  o.stock != null && `Stock: ${o.stock}`,
                  o.location && `Ubic: ${o.location}`,
                  o.compatibility && `Compat.: ${o.compatibility}`,
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
              {allowCreate && (
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="w-full text-left px-3 py-2 text-sm border-t border-slate-100 text-amber-600 hover:bg-amber-50 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear producto &ldquo;{q.trim()}&rdquo;</span>
                </button>
              )}
            </>
          )}
        </div>
      )}

      {showCreate && (
        <ProductQuickForm
          open={showCreate}
          onOpenChange={setShowCreate}
          defaultName={q.trim()}
          suppliers={suppliers}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}