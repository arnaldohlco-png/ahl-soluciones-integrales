import React, { useRef, useState, useLayoutEffect } from "react";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";

// Captura de firma digital sobre lienzo (canvas). Emite un data URL PNG.
export default function SignaturePad({ value, onChange, label, height = 120, disabled }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const inkRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const w = Math.max(canvas.parentElement.clientWidth, 1);
    canvas.width = w * ratio;
    canvas.height = height * ratio;
    canvas.style.width = "100%";
    canvas.style.height = height + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    if (value) {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0, w, height); inkRef.current = true; setHasInk(true); };
      img.src = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const start = (e) => {
    if (disabled) return;
    e.preventDefault();
    drawingRef.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };
  const move = (e) => {
    if (!drawingRef.current || disabled) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    if (!inkRef.current) { inkRef.current = true; setHasInk(true); }
  };
  const end = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (inkRef.current) onChange(canvasRef.current.toDataURL("image/png"));
  };
  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    inkRef.current = false;
    setHasInk(false);
    onChange("");
  };

  return (
    <div>
      {label && <p className="text-sm font-medium text-slate-600 mb-1">{label}</p>}
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full rounded-md border border-slate-300 bg-white touch-none cursor-crosshair"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
        {!hasInk && !value && (
          <p className="absolute inset-0 flex items-center justify-center text-slate-300 text-sm pointer-events-none select-none">Firme aquí</p>
        )}
      </div>
      <div className="flex justify-end mt-1">
        <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={disabled} className="text-slate-500 hover:text-red-600 h-7">
          <Eraser className="w-3.5 h-3.5 mr-1" /> Limpiar
        </Button>
      </div>
    </div>
  );
}