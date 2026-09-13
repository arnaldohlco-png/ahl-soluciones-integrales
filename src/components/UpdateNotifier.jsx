import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

// Detecta cuando se publica una nueva versión de la app comparando los
// assets (scripts/estilos) del index.html vigente contra los cargados en
// memoria. Si hay diferencia, muestra un aviso para recargar.
const POLL_MS = 4 * 60 * 1000; // revisa cada 4 minutos

function extractAssetSrcs(html) {
  const set = new Set();
  const reScript = /<script[^>]*\bsrc=["']([^"']+)["'][^>]*>/g;
  let m;
  while ((m = reScript.exec(html))) set.add(m[1].split("?")[0]);
  const reLink = /<link[^>]*\bhref=["']([^"']+\.css[^"']*)["'][^>]*>/g;
  while ((m = reLink.exec(html))) set.add(m[1].split("?")[0]);
  return set;
}

function currentAssetSrcs() {
  const set = new Set();
  document.querySelectorAll("script[src]").forEach((el) => set.add(el.getAttribute("src").split("?")[0]));
  document.querySelectorAll('link[rel="stylesheet"][href]').forEach((el) => set.add(el.getAttribute("href").split("?")[0]));
  return set;
}

export default function UpdateNotifier() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const res = await fetch(`/index.html?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const html = await res.text();
        const remote = extractAssetSrcs(html);
        if (!remote.size) return;
        const local = currentAssetSrcs();
        const norm = (s) => s.replace(/^\//, "");
        let diff = false;
        remote.forEach((s) => {
          if (!local.has(s) && !local.has("/" + s) && !local.has(norm(s))) diff = true;
        });
        if (active && diff) {
          // Auto-recargar una sola vez por sesión para tomar la versión vigente,
          // evitando bucles si por algún motivo el diff persiste tras recargar.
          const key = "base44-autoreload-done";
          if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, "1");
            window.location.reload();
            return;
          }
          setAvailable(true);
        }
      } catch (e) { /* ignore */ }
    };
    const id = setInterval(check, POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    check();
    return () => {
      active = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!available) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex items-center gap-3 rounded-lg border border-amber-300 bg-white shadow-lg px-4 py-3 max-w-[92vw]">
      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-100 text-amber-600 shrink-0">
        <RefreshCw className="w-5 h-5" />
      </div>
      <div className="text-sm">
        <p className="font-semibold text-slate-800">Hay una nueva versión disponible</p>
        <p className="text-slate-500 text-xs">Actualiza para ver los últimos cambios.</p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="ml-1 inline-flex items-center gap-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium px-3 py-1.5"
      >
        Actualizar
      </button>
      <button
        onClick={() => setAvailable(false)}
        className="text-slate-400 hover:text-slate-600 ml-1"
        aria-label="Cerrar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}