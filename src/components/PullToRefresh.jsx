import React, { useRef, useState } from "react";
import { Loader2, ArrowDown } from "lucide-react";

const THRESHOLD = 70;
// No iniciar el gesto sobre diálogos, lienzos (firma), campos o zonas marcadas.
const BLOCK = '[role="dialog"], canvas, input, textarea, select, [data-no-ptr], .fixed.inset-0';

function scrolledAncestor(el) {
  while (el && el !== document.body) {
    if (el.scrollTop > 0) return true;
    el = el.parentElement;
  }
  return false;
}

// Envoltorio "tirar para refrescar". No aplica transformaciones al contenido
// (para no romper encabezados sticky ni elementos fixed).
export default function PullToRefresh({ onRefresh, disabled, children }) {
  const startY = useRef(null);
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);

  const onTouchStart = (e) => {
    if (disabled || busy) return;
    if (window.scrollY > 0 || e.target.closest(BLOCK) || scrolledAncestor(e.target)) return;
    startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e) => {
    if (startY.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0 || window.scrollY > 0) { startY.current = null; setPull(0); return; }
    setPull(Math.min(dy * 0.5, 100));
  };
  const onTouchEnd = async () => {
    if (startY.current == null) return;
    startY.current = null;
    if (pull >= THRESHOLD * 0.5) {
      setBusy(true);
      setPull(0);
      await onRefresh();
      setTimeout(() => setBusy(false), 600);
    } else setPull(0);
  };

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}>
      {(pull > 0 || busy) && (
        <div className="md:hidden fixed left-0 right-0 z-20 flex justify-center pointer-events-none" style={{ top: "calc(3.5rem + env(safe-area-inset-top))" }}>
          <div className="mt-2 w-9 h-9 rounded-full bg-card border border-border shadow flex items-center justify-center text-muted-foreground" style={{ opacity: busy ? 1 : Math.min(pull / 40, 1) }}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDown className="w-4 h-4" style={{ transform: `rotate(${pull >= THRESHOLD * 0.5 ? 180 : 0}deg)` }} />}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}