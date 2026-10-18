import React from "react";
import { Image } from "@/components/ui/image";

export default function AreaPanel({ title, icon: Icon, image, imageAlt, children, delay = 0 }) {
  return (
    <section
      className="bg-[#263442] border border-[#34475a] rounded-lg shadow-[0_14px_34px_rgba(0,0,0,0.4)] overflow-hidden dash-rise"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-stretch border-b-4 border-[#F0B429] bg-[#1d2833]">
        <div className="bg-[#F0B429] text-[#18212B] w-14 md:w-16 flex items-center justify-center">
          <Icon className="w-6 h-6 md:w-7 md:h-7" strokeWidth={2.4} />
        </div>
        <h2 className="flex-1 px-5 md:px-6 py-4 text-sm md:text-base font-black uppercase tracking-[0.3em] flex items-center">
          {title}
        </h2>
        <div className="w-28 md:w-[210px] relative shrink-0">
          <Image src={image} alt={imageAlt} fittingType="fill" className="w-full h-full" />
        </div>
      </div>
      <div className="p-5 md:p-6 flex flex-col gap-4">{children}</div>
    </section>
  );
}