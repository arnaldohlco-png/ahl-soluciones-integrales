import React, { useState } from "react";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseFaults, NO_FAULTS_TEXT } from "@/lib/faultChecklist";

// answer: "si" | "no" | "" ; value: JSON de puntos [{id,text,solved}]
export default function FaultChecklist({ answer, value, onChange }) {
  const [draft, setDraft] = useState("");
  const items = parseFaults(value);
  const solved = items.filter((i) => i.solved).length;

  const emit = (nextAnswer, nextItems) => onChange({
    fault_answer: nextAnswer,
    fault_checklist: JSON.stringify(nextAnswer === "si" ? nextItems : []),
    reported_fault: nextAnswer === "no" ? NO_FAULTS_TEXT : nextItems.map((i) => i.text).join("\n")
  });

  const add = () => {
    const lines = draft.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    const news = lines.map((text, i) => ({ id: `${Date.now()}-${i}`, text, solved: false }));
    emit("si", [...items, ...news]);
    setDraft("");
  };
  const update = (id, patch) => emit("si", items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  return (
    <div className="rounded-xl border border-slate-200 p-3 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Label>¿El cliente reporta alguna falla?</Label>
        <div className="flex gap-1">
          {[["si", "Sí"], ["no", "No"]].map(([k, l]) =>
          <button key={k} type="button" onClick={() => emit(k, items)}
          className={`px-4 py-1 rounded-md text-sm font-medium border ${answer === k ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}>{l}</button>
          )}
        </div>
      </div>

      {answer === "no" && <p className="text-sm text-slate-500 flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> {NO_FAULTS_TEXT}</p>}

      {answer === "si" &&
      <div className="space-y-2">
          <div className="flex gap-2">
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Escribe una falla y presiona Agregar"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
            <Button type="button" onClick={add} className="bg-amber-500 hover:bg-amber-600 text-slate-900 shrink-0"><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
          </div>
          {items.length === 0 && <p className="text-xs text-amber-600">Agrega al menos una falla reportada.</p>}
          {items.length > 0 &&
        <>
              <p className={`text-xs font-medium ${solved === items.length ? "text-emerald-600" : "text-amber-600"}`}>{solved} de {items.length} fallas solucionadas</p>
              <ul className="space-y-1.5">
                {items.map((i) =>
            <li key={i.id} className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4 accent-emerald-600 shrink-0" checked={!!i.solved} onChange={(e) => update(i.id, { solved: e.target.checked })} />
                    <Input value={i.text} onChange={(e) => update(i.id, { text: e.target.value, solved: false })}
              className={`h-8 ${i.solved ? "line-through text-slate-400" : ""}`} />
                    <button type="button" onClick={() => emit("si", items.filter((x) => x.id !== i.id))} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </li>
            )}
              </ul>
            </>
        }
        </div>
      }
    </div>);

}