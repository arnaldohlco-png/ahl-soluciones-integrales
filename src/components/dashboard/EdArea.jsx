import React from "react";
import { Image } from "@/components/ui/image";

export default function EdArea({ title, image, delay = 0, children }) {
  return (
    <section className="pt-[34px] pb-2 ed-fade" style={{ animationDelay: `${delay}s` }}>
      <div className="grid grid-cols-[1fr_120px] md:grid-cols-[1fr_300px] gap-4 md:gap-8 items-end">
        <h2 className="text-[34px] md:text-[52px] leading-[1.1] font-normal pb-3.5">{title}</h2>
        <div className="h-[80px] md:h-[130px] border border-[#111] mb-3.5 overflow-hidden ed-sepia">
          <Image src={image} alt={title} fittingType="fill" className="w-full h-full" />
        </div>
      </div>
      <div className="ed-rule2" />
      <div className="mt-1.5">{children}</div>
    </section>
  );
}