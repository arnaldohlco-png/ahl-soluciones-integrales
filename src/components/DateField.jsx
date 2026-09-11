import React from "react";
import moment from "moment";
import { Label } from "@/components/ui/label";

// Campo de fecha que siempre muestra el valor en formato DD/MM/AAAA
// (independiente del idioma del navegador), manteniendo el calendario nativo.
export default function DateField({ value, onChange, label, className }) {
  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      <div className="relative mt-1">
        <input
          type="date"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex h-9 w-full items-center justify-start rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm text-foreground pointer-events-none">
          {value ? moment(value).format("DD/MM/YYYY") : <span className="text-muted-foreground">DD/MM/AAAA</span>}
        </div>
      </div>
    </div>
  );
}