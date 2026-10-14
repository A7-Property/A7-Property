import Image from "next/image";

import { cn } from "@/lib/utils";

interface A7BrandProps {
  compact?: boolean;
  inverted?: boolean;
  showMyanmar?: boolean;
  className?: string;
}

function A7Brand({ compact = false, inverted = false, showMyanmar = false, className }: A7BrandProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-[13px] border border-[#0057D9]/10 bg-white shadow-[0_5px_16px_rgba(0, 87, 217,.12)]">
        <Image
          src="/images/brand/a7-property-logo.jpg"
          alt=""
          aria-hidden="true"
          fill
          loading="eager"
          sizes="40px"
          className="scale-[2.55] object-contain"
        />
      </span>
      {!compact && (
        <span className={cn("whitespace-nowrap text-[20px] font-semibold tracking-[-0.045em]", inverted ? "text-white" : "text-[#111827]")}>
          A7 <span className={inverted ? "text-[#E8C39B]" : "text-[#0057D9]"}>Property</span>
        </span>
      )}
      {showMyanmar && !compact && <span className={cn("hidden whitespace-nowrap border-l pl-3 text-[11px] sm:inline", inverted ? "border-white/15 text-white/55" : "border-[#E5E2DB] text-[#707A76]")} lang="my">အိမ်ခြံမြေ</span>}
    </span>
  );
}

export { A7Brand };
