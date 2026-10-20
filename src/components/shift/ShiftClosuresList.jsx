import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { fmtBogota } from "@/lib/localDate";
import ShiftReportView from "@/components/shift/ShiftReportView";

const fmt = (n) => `$${(n || 0).toLocaleString("es-CO")}`;

export default function ShiftClosuresList({ open, onOpenChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    base44.entities.ShiftClosure.filter({}, { sort: "-created_date", limit: 50 })
      .then((p) => setItems(p.items || []))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Reportes de cierre de turno</DialogTitle></DialogHeader>
          {loading ? <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            : items.length === 0 ? <p className="text-center text-sm text-slate-400 py-6">Aún no hay cierres guardados.</p>
            : <div className="space-y-2">
              {items.map((c) => (
                <button key={c.id} onClick={() => setReport(JSON.parse(c.report))} className="w-full text-left border border-slate-200 rounded-lg p-3 hover:bg-slate-50">
                  <p className="text-sm font-semibold text-slate-900">{c.register_type} · Turno {c.turno_number ?? "—"}</p>
                  <p className="text-xs text-slate-500">{fmtBogota(c.close_date)} · {c.responsible || "—"}</p>
                  <p className="text-xs text-slate-600">Esperado {fmt(c.expected)} · Contado {fmt(c.counted)} · Dif. {fmt(c.difference)}</p>
                </button>
              ))}
            </div>}
        </DialogContent>
      </Dialog>
      {report && <ShiftReportView report={report} onClose={() => setReport(null)} />}
    </>
  );
}