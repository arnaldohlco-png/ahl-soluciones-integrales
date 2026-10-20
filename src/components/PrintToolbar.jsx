import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import PdfWhatsAppButton from "@/components/PdfWhatsAppButton";

export default function PrintToolbar({ onClose, defaultFormat = "a4", whatsappPhone, whatsappMessage }) {
  const [format, setFormat] = useState(defaultFormat);

  const handlePrint = () => {
    const body = document.body;
    body.classList.remove("print-80mm");
    if (format === "80mm") body.classList.add("print-80mm");
    // limpia la clase tras imprimir para no afectar otras impresiones
    const cleanup = () => {
      body.classList.remove("print-80mm");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  };

  return (
    <div className="no-print flex flex-wrap items-center justify-end gap-2 p-3 border-b border-slate-200">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-500 font-medium">Formato:</span>
        <div className="inline-flex rounded-md border border-slate-300 overflow-hidden">
          <button
            type="button"
            onClick={() => setFormat("a4")}
            className={`px-3 py-1.5 font-medium transition-colors ${
              format === "a4" ? "bg-slate-800 text-white" : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            A4
          </button>
          <button
            type="button"
            onClick={() => setFormat("80mm")}
            className={`px-3 py-1.5 font-medium transition-colors border-l border-slate-300 ${
              format === "80mm" ? "bg-slate-800 text-white" : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            80mm
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        <PdfWhatsAppButton phone={whatsappPhone} message={whatsappMessage} format={format} />
        <Button onClick={handlePrint} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
          <Printer className="w-4 h-4 mr-1" /> Imprimir
        </Button>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-1" /> Cerrar
          </Button>
        )}
      </div>
    </div>
  );
}