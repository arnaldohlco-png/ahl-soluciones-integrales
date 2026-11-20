import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Loader2 } from "lucide-react";
import { generatePdfUrl } from "@/lib/sendPdfWhatsApp";

export default function PdfEmailButton({ email, message, format = "a4" }) {
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    try {
      const url = await generatePdfUrl({ format });
      const body = (message || "").replace("{{link}}", url);
      window.location.href = `mailto:${email}?subject=${encodeURIComponent("Su documento")}&body=${encodeURIComponent(body)}`;
    } catch (e) {
      console.error(e);
      alert("No se pudo generar el PDF para el correo: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button type="button" onClick={send} disabled={!email || busy} title={email ? `Enviar a ${email}` : "Sin correo registrado"}
      className="bg-blue-500 hover:bg-blue-600 text-white">
      {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Mail className="w-4 h-4 mr-1" />}
      {busy ? "Generando..." : "Correo"}
    </Button>
  );
}