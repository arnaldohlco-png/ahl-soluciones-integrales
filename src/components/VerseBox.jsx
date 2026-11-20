import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export const DEFAULT_VERSE = {
  text: "Porque yo sé los planes que tengo para ustedes, planes de bienestar y no de calamidad, a fin de darles un futuro y una esperanza.",
  reference: "Jeremías 29:11",
};

export default function VerseBox() {
  const [verse, setVerse] = useState(DEFAULT_VERSE);

  useEffect(() => {
    let alive = true;
    base44.entities.Company.list("-created_date", 1).then((list) => {
      const c = list?.[0];
      if (alive && c?.verse_text?.trim()) {
        setVerse({ text: c.verse_text.trim(), reference: (c.verse_reference || "").trim() });
      }
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <div className="mt-4 border-2 border-slate-800 rounded-md p-3 text-center font-bold text-[12px] text-slate-900">
      <p>"{verse.text}"</p>
      {verse.reference && <p className="mt-1">{verse.reference}</p>}
    </div>
  );
}