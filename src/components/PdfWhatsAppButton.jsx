import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MessageCircle, Loader2 } from "lucide-react";
import { generateAndSendPdf } from "@/lib/sendPdfWhatsApp";

const openWhatsApp = (phone, message) => {
  const clean = (phone || "").replace(/\D/g, "");
  const full = clean.length === 10 ? `57${clean}` : clean;
  const text = (message || "")
    .replace(/\s*(Puede ver (el documento en )?(el )?PDF aquí|Puede ver el documento en PDF aquí):?\s*\{\{link\}\}/i, "")
    .replace("{{link}}", "")
    .trim();
  window.open(`https://wa.me/${full}?text=${encodeURIComponent(text)}`, "_blank");
};

export default function PdfWhatsAppButton({ phone, message, format = "a4", label = "WhatsApp" }) {
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(false);
  const disabled = !phone || busy;

  const withPdf = async () => {
    const win = window.open("about:blank", "_blank");
    setAsk(false);
    setBusy(true);
    try {
      await generateAndSendPdf({ phone, message, format, win });
    } catch (e) {
      console.error(e);
      if (win && !win.closed) win.close();
      alert("No se pudo generar/enviar el PDF: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const withoutPdf = () => {
    setAsk(false);
    openWhatsApp(phone, message);
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => phone && setAsk(true)}
        disabled={disabled}
        title={phone ? `Enviar a ${phone}` : "Sin destinatario"}
        className="bg-emerald-500 hover:bg-emerald-600 text-white"
      >
        {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-1" />}
        {busy ? "Generando..." : label}
      </Button>
      <Dialog open={ask} onOpenChange={setAsk}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>¿Adjuntar el PDF?</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500">Elige si el mensaje de WhatsApp incluye el documento en PDF.</p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={withoutPdf}>Solo mensaje</Button>
            <Button onClick={withPdf} className="bg-emerald-500 hover:bg-emerald-600 text-white">Adjuntar PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}