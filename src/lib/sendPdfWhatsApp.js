import { base44 } from "@/api/base44Client";

const CDN = {
  html2canvas: "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  jspdf: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
};

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "1") resolve();
      else existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.src = src;
    s.onload = () => {
      s.dataset.loaded = "1";
      resolve();
    };
    s.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.head.appendChild(s);
  });

const loadLibs = async () => {
  await Promise.all([loadScript(CDN.html2canvas), loadScript(CDN.jspdf)]);
  const jsPDF = window.jspdf?.jsPDF;
  const html2canvas = window.html2canvas;
  if (!jsPDF || !html2canvas) throw new Error("Librerías PDF no disponibles");
  return { jsPDF, html2canvas };
};

/**
 * Genera un PDF del elemento .print-area visible y lo envía por WhatsApp.
 * @param {Object} opts
 * @param {string} opts.phone - teléfono del destinatario
 * @param {string} opts.message - texto; reemplaza {{link}} con la URL del PDF
 * @param {("a4"|"80mm")} opts.format - formato del PDF
 * @returns {Promise<string>} file_url del PDF subido
 */
export async function generateAndSendPdf({ phone, message, format = "a4" }) {
  const printArea = document.querySelector(".print-area");
  if (!printArea) throw new Error("No hay documento para enviar");

  // Ocultar elementos no imprimibles (barra de herramientas) durante la captura
  const hidden = [];
  printArea.querySelectorAll(".no-print").forEach((el) => {
    const prev = el.style.display;
    el.style.display = "none";
    hidden.push([el, prev]);
  });

  // Forzar el ancho del documento segun formato y simular viewport de escritorio
  // para que el layout responsivo (sm:/md:) se renderice como A4/80mm y no apilado.
  const is80 = format === "80mm";
  const prevWidth = printArea.style.width;
  const prevMaxWidth = printArea.style.maxWidth;
  if (is80) {
    document.body.classList.add("print-80mm");
  } else {
    printArea.style.width = "794px";
    printArea.style.maxWidth = "none";
  }

  try {
    const { jsPDF, html2canvas } = await loadLibs();
    const canvas = await html2canvas(printArea, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: 1024,
    });

    const pdf =
      format === "80mm"
        ? new jsPDF({ orientation: "portrait", unit: "mm", format: [80, 297] })
        : new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    let heightLeft = imgH;
    let position = 0;
    pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0) {
      position -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
      heightLeft -= pageH;
    }

    const blob = pdf.output("blob");
    const file = new File([blob], "documento.pdf", { type: "application/pdf" });
    const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });

    const cleanPhone = (phone || "").replace(/\D/g, "");
    if (!cleanPhone) throw new Error("Teléfono del destinatario no válido");
    const fullPhone = cleanPhone.length === 10 ? `57${cleanPhone}` : cleanPhone;
    const text = (message || "").replace("{{link}}", file_url);
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");

    return file_url;
  } finally {
    hidden.forEach(([el, prev]) => {
      el.style.display = prev;
    });
    printArea.style.width = prevWidth;
    printArea.style.maxWidth = prevMaxWidth;
    document.body.classList.remove("print-80mm");
  }
}