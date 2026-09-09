import React from "react";
import { MessageCircle } from "lucide-react";

export default function WhatsAppButton({ phone, message, label, variant = "ghost", size = "icon" }) {
  if (!phone) return null;

  const handleClick = () => {
    const cleanPhone = (phone || "").replace(/\D/g, "");
    if (!cleanPhone) return;
    // Ensure country code (Colombia +57) if it's a 10-digit number
    const fullPhone = cleanPhone.length === 10 ? `57${cleanPhone}` : cleanPhone;
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const sizeClass = size === "icon" ? "p-1.5" : "px-3 py-1.5 text-sm";
  const variantClass = variant === "ghost" ? "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50" : "text-emerald-600 hover:bg-emerald-50";

  return (
    <button
      onClick={handleClick}
      title={label || "Enviar por WhatsApp"}
      className={`${sizeClass} ${variantClass} rounded-lg transition-colors flex items-center gap-1`}
    >
      <MessageCircle className={size === "icon" ? "w-4 h-4" : "w-3.5 h-3.5"} />
      {size !== "icon" && label && <span>{label}</span>}
    </button>
  );
}