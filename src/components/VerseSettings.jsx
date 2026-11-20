import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function VerseSettings({ form, setForm, isAdmin, active, nextChange, onResume }) {
  return (
    <div className="border-t border-slate-100 pt-4 space-y-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Texto bíblico de los pies de página</p>
      <div>
        <Label>Versículo</Label>
        <Textarea value={form.verse_text} onChange={(e) => setForm({ ...form, verse_text: e.target.value })} className="mt-1 resize-y" rows={2} disabled={!isAdmin}
          placeholder="Si lo dejas vacío se usa Jeremías 29:11" />
      </div>
      <div>
        <Label>Referencia</Label>
        <Input value={form.verse_reference} onChange={(e) => setForm({ ...form, verse_reference: e.target.value })} className="mt-1" disabled={!isAdmin} placeholder="Ej: Salmos 23:1" />
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`text-xs font-medium ${active ? "text-emerald-600" : "text-amber-600"}`}>
          {active ? `Rotación automática activa${nextChange ? ` · próximo cambio: ${new Date(nextChange).toLocaleDateString("es-CO")}` : ""}` : "Rotación automática pausada"}
        </span>
        {isAdmin && !active && (
          <Button type="button" variant="outline" size="sm" onClick={onResume}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reanudar rotación
          </Button>
        )}
      </div>
      <p className="text-xs text-slate-400">Cada 8 días el sistema genera un versículo nuevo. Al guardar un texto distinto, la rotación se pausa hasta que la reanudes.</p>
    </div>
  );
}