import React from "react";
import { useNavigate } from "react-router-dom";
import { Bike, ChevronLeft, Menu } from "lucide-react";

// Encabezado móvil: flecha atrás en rutas hijas, logo/título en rutas raíz.
export default function PageHeader({ isRoot, onMenu }) {
  const navigate = useNavigate();
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate("/"));
  return (
    <div
      className="no-print md:hidden fixed top-0 inset-x-0 z-30 bg-slate-900 text-white"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
        paddingRight: "max(1rem, env(safe-area-inset-right))",
      }}>
      <div className="h-14 flex items-center justify-between">
        {isRoot ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
              <Bike className="w-5 h-5 text-slate-900" />
            </div>
            <span className="font-bold">AHL Soluciones Integrales</span>
          </div>
        ) : (
          <button onClick={goBack} aria-label="Volver" className="flex items-center gap-1 -ml-2 pr-3 font-medium">
            <ChevronLeft className="w-6 h-6" />
            Volver
          </button>
        )}
        <button onClick={onMenu} aria-label="Abrir menú" className="p-2 -mr-2 flex items-center justify-center">
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}