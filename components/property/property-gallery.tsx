"use client";

import { Expand, Heart, Images, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useLanguage } from "@/components/i18n/language-provider";
import { cn } from "@/lib/utils";

interface PropertyGalleryProps {
  images: string[];
  title: string;
  verified?: boolean;
  favorite?: boolean;
  onToggleFavorite?: () => void;
}

function PropertyGallery({ images, title, verified = false, favorite = false, onToggleFavorite }: PropertyGalleryProps) {
  const { tx } = useLanguage();
  const gallery = images.filter(Boolean);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const railRef = useRef<HTMLDivElement | null>(null);

  function handleScroll() {
    if (!railRef.current) return;
    const next = Math.round(railRef.current.scrollLeft / railRef.current.clientWidth);
    if (next !== selected && next >= 0 && next < gallery.length) setSelected(next);
  }

  return (
    <>
      <section aria-label={tx("Property photos", "အိမ်ဓာတ်ပုံများ")} className="relative overflow-hidden bg-[#E1E2EE]">
        <div ref={railRef} onScroll={handleScroll} className="hide-scrollbar flex aspect-[16/10] max-h-[520px] snap-x snap-mandatory overflow-x-auto">
          {gallery.map((image, index) => (
            <button key={`${image}-hero-${index}`} type="button" onClick={() => { setSelected(index); setOpen(true); }} className="relative min-w-full snap-center overflow-hidden bg-[#E1E2EE] text-left" aria-label={tx(`Open property photo ${index + 1}`, `အိမ်ဓာတ်ပုံ ${index + 1} ကို ဖွင့်ရန်`)}>
              <Image src={image} alt={tx(`${title} — view ${index + 1}`, `${title} — မြင်ကွင်း ${index + 1}`)} fill loading={index === 0 ? "eager" : "lazy"} sizes="(max-width: 800px) 100vw, 760px" className="object-cover transition-transform duration-700 hover:scale-[1.025]" />
              <span className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/25 to-transparent" aria-hidden="true" />
            </button>
          ))}
        </div>

        <span className="pointer-events-none absolute bottom-3 right-4 inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-[#FAF8FF]/90 px-3 text-[10px] font-semibold leading-none text-[#191B24] shadow-sm backdrop-blur-md"><Images className="size-4 shrink-0" /><span className="relative top-px inline-flex items-center leading-none">{selected + 1} / {gallery.length}</span></span>
        {verified && <span className="pointer-events-none absolute left-4 top-4 inline-flex h-9 items-center rounded-full border border-white/70 bg-white/92 px-3 text-[11px] font-semibold text-[#123B73] shadow-[0_5px_18px_rgba(0,0,0,.14)] backdrop-blur-md"><span className="flex size-5 items-center justify-center" aria-hidden="true"><ShieldCheck className="size-4 -translate-y-px fill-[#123B73] text-white" /></span><span className="ml-1.5 inline-flex h-5 items-center leading-none">{tx("Verified listing", "စိစစ်ထားသောအိမ်")}</span></span>}
        {onToggleFavorite && <button type="button" onClick={onToggleFavorite} className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-[#FAF8FF]/90 text-[#0053D2] shadow-[0_4px_18px_rgba(0,0,0,.12)] backdrop-blur-md transition-transform active:scale-95" aria-label={favorite ? tx("Remove from saved homes", "သိမ်းထားသောအိမ်မှ ဖယ်ရန်") : tx("Save property", "အိမ်ကို သိမ်းရန်")} aria-pressed={favorite}><Heart className={cn("size-5", favorite && "fill-current")} /></button>}

        <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5" aria-hidden="true">
          {gallery.map((_, index) => <span key={index} className={cn("h-1.5 rounded-full bg-white shadow-sm transition-[width,opacity]", selected === index ? "w-4 opacity-100" : "w-1.5 opacity-55")} />)}
        </div>
      </section>

      <BottomSheet open={open} onOpenChange={setOpen} title={tx("Property gallery", "အိမ်ဓာတ်ပုံများ")} description={tx(`${gallery.length} property photos`, `အိမ်ဓာတ်ပုံ ${gallery.length} ပုံ`)} className="h-[94vh] max-h-none">
        <div className="mx-auto grid h-full max-w-6xl grid-rows-[1fr_auto] gap-4 p-4 sm:p-6">
          <div className="relative min-h-0 overflow-hidden rounded-[20px] bg-[#191B24]">
            <Image src={gallery[selected]} alt={tx(`${title} — enlarged view ${selected + 1}`, `${title} — ချဲ့ထားသောမြင်ကွင်း ${selected + 1}`)} fill sizes="100vw" className="object-contain" />
            <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-[#191B24]/68 px-3 py-1.5 text-[10px] text-white backdrop-blur"><Expand className="size-3.5" />{selected + 1} / {gallery.length}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {gallery.map((image, index) => <button key={`${image}-thumb-${index}`} className={cn("relative h-16 w-24 shrink-0 overflow-hidden rounded-[12px] border-2", selected === index ? "border-[#0053D2]" : "border-transparent opacity-65")} onClick={() => setSelected(index)} aria-label={tx(`View photo ${index + 1}`, `ဓာတ်ပုံ ${index + 1} ကို ကြည့်ရန်`)} aria-pressed={selected === index}><Image src={image} alt="" fill sizes="96px" className="object-cover" /></button>)}
          </div>
        </div>
      </BottomSheet>
    </>
  );
}

const ImageGallery = PropertyGallery;

export { ImageGallery, PropertyGallery };
