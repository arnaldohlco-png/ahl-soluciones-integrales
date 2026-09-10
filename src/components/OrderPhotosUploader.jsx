import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Camera, Trash2, ImagePlus } from "lucide-react";

const MAX = 6;

export default function OrderPhotosUploader({ value, onChange }) {
  // value: JSON string of array of urls
  const photos = (() => { try { return JSON.parse(value || "[]"); } catch { return []; } })();
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const setPhotos = (arr) => onChange(JSON.stringify(arr));

  const handleFiles = async (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    const remaining = MAX - photos.length;
    const toUpload = list.slice(0, remaining);
    if (!toUpload.length) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of toUpload) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploaded.push(file_url);
      }
      setPhotos([...photos, ...uploaded]);
    } catch (e) {
      console.error(e);
      alert("Error al subir la foto");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

  const removePhoto = (idx) => setPhotos(photos.filter((_, i) => i !== idx));

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {photos.map((url, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100 group">
            <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(i)}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-90 hover:bg-red-600 transition-colors"
              title="Quitar foto"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {photos.length < MAX && (
          <>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-amber-400 hover:text-amber-500 transition-colors disabled:opacity-50"
              title="Subir desde archivo"
            >
              <ImagePlus className="w-5 h-5" />
              <span className="text-[10px] mt-1">Archivo</span>
            </button>
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={uploading}
              className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-amber-400 hover:text-amber-500 transition-colors disabled:opacity-50"
              title="Tomar foto"
            >
              <Camera className="w-5 h-5" />
              <span className="text-[10px] mt-1">Cámara</span>
            </button>
          </>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <p className="text-xs text-slate-400 mt-2">
        {uploading ? "Subiendo..." : `${photos.length}/${MAX} fotos · cuadradas para evitar distorsión`}
      </p>
    </div>
  );
}