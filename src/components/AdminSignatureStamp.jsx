import React from "react";

// Firma administrativa guardada en Empresa, para todos los documentos imprimibles.
export default function AdminSignatureStamp({ company }) {
  if (!company?.admin_signature) return null;
  return (
    <div className="mt-6 flex justify-end">
      <div className="w-56 text-center text-[11px] text-slate-600">
        <img src={company.admin_signature} alt="Firma administrador" crossOrigin="anonymous" className="h-16 mx-auto object-contain" />
        <div className="border-t border-slate-800 pt-1">Firma del Administrador<br />{company.name}</div>
      </div>
    </div>
  );
}