import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";
import { generateAndSendPdf } from "@/lib/sendPdfWhatsApp";

export default function PdfWhatsAppButton({ phone, message, format = "a4", label = "WhatsApp" }) {
  const [busy, setBusy] = useState(false);
  const disabled = !phone || busy;

  const handle = async () => {
    if (!phone) return;
    setBusy(true);
    try {
      await generateAndSendPdf({ phone, message, format });
    } catch (e) {
      console.error(e);
      alert("No se pudo generar/enviar el PDF: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handle}
      disabled={disabled}
      title={phone ? `Enviar a ${phone}` : "Sin destinatario"}
      className="bg-emerald-500 hover:bg-emerald-600 text-white"
    >
      {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-1" />}
      {busy ? "Generando..." : label}
    </Button>
  );
}