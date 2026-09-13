import React from "react";

// Detecta fallos de carga de fragmentos JS (típicos tras una republicación cuando
// el navegador o un service worker antiguo intenta cargar chunks que ya no existen)
// y recarga la página una vez para recuperar la versión vigente.
export default class ChunkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    const msg = String(error?.message || "");
    const isChunkError =
      /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(msg);
    if (isChunkError && !sessionStorage.getItem("chunk-reloaded")) {
      sessionStorage.setItem("chunk-reloaded", "1");
      window.location.reload();
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-slate-50">
          <p className="text-lg font-semibold text-slate-800">Se actualizó la aplicación</p>
          <p className="text-sm text-slate-500 max-w-sm">
            Recarga la página para usar la versión más reciente. Si el problema persiste, borra los datos del sitio en tu navegador.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 rounded-md bg-amber-500 text-slate-900 font-medium hover:bg-amber-600"
          >
            Recargar ahora
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}