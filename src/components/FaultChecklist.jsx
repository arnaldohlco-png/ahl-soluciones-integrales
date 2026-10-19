import React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2 } from "lucide-react";
import { buildChecklist, parseChecklist, NO_FAULTS_NOTE } from "@/lib/faultChecklist";

export default function FaultChecklist({ form, setForm }) {
  const items = parseChecklist(form.fault_checklist);
  const doneCount = items.filter((i) => i.done).length;

  const answer = (v) => {
    if (v === "no") setForm({ ...form, has_faults: "no", reported_fault: NO_FAULTS_NOTE, fault_checklist: "[]" });
    else setForm({ ...form, has_faults: "si", reported_fault: form.reported_fault === NO_FAULTS_NOTE ? "" : form.reported_fault });
  };

  const onText = (text) =>
    setForm({ ...form, reported_fault: text, fault_checklist: JSON.stringify(buildChecklist(text, form.fault_checklist)) });

  const toggle = (idx, checked) => {
    const next = items.map((it, i) => (i === idx ? { ...it, done: !!checked } : it));
    setForm({ ...form, fault_checklist: JSON.stringify(next) });
  };

  const btn = (v, label) => (
    <button type="button" onClick={() => answer(v)}
      className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors ${form.has_faults === v ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      <div>
        <Label>¿El cliente reporta alguna falla?</Label>
        <div className="flex gap-2 mt-1">{btn("si", "Sí")}{btn("no", "No")}</div>
      </div>
      {form.has_faults === "no" &&
        <p className="text-sm text-slate-500 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> {NO_FAULTS_NOTE}</p>}
      {form.has_faults === "si" &&
        <>
          <div>
            <Label>Fallas reportadas (una por línea)</Label>
            <Textarea value={form.reported_fault} onChange={(e) => onText(e.target.value)} className="mt-1" rows={3} placeholder={"Ej:\nNo enciende\nRuido en la cadena"} />
          </div>
          {items.length > 0 &&
            <div className="rounded-lg border border-slate-200 p-3 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Lista de chequeo · {doneCount}/{items.length} solucionadas
              </p>
              {items.map((it, i) =>
                <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={it.done} onCheckedChange={(c) => toggle(i, c)} />
                  <span className={it.done ? "line-through text-slate-400" : "text-slate-800"}>{it.text}</span>
                </label>
              )}
              {doneCount < items.length && <p className="text-xs text-amber-600">Todas deben estar solucionadas para cerrar la orden.</p>}
            </div>}
        </>}
    </div>
  );
}