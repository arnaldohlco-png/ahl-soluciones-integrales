import React, { useEffect, useRef } from "react";

// Dispara onVisible cuando el usuario llega al final de la lista (carga por scroll).
export default function LoadMoreSentinel({ onVisible, loading }) {
  const ref = useRef(null);
  const cb = useRef(onVisible);
  cb.current = onVisible;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading) cb.current();
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loading]);
  return <div ref={ref} className="h-8 flex items-center justify-center text-xs text-muted-foreground">{loading ? "Cargando..." : ""}</div>;
}