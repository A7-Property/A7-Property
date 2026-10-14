import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  icon: LucideIcon;
  tone?: "jade" | "sand" | "copper";
}

function MetricCard({ label, value, change, icon: Icon, tone = "jade" }: MetricCardProps) {
  const toneClass = tone === "sand" ? "bg-[#DCEBFF] text-[#667085]" : tone === "copper" ? "bg-[#DCEBFF] text-[#123B73]" : "bg-[#DCEBFF] text-[#123B73]";
  return (
    <Card className="group overflow-hidden rounded-[20px] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(23,43,63,.1)]">
      <CardContent className="relative p-4 sm:p-5">
        <div className="pointer-events-none absolute -right-8 -top-10 size-24 rounded-full bg-[#123B73]/5 transition-transform duration-300 group-hover:scale-125" />
        <div className="relative flex items-start justify-between"><span className={`grid size-10 place-items-center rounded-xl ${toneClass}`}><Icon className="size-[19px]" /></span>{change && <span className="rounded-full border border-[#287A4B]/10 bg-[#F3FAF6] px-2 py-1 text-[10px] font-semibold text-[#287A4B]">{change}</span>}</div>
        <div className="relative mt-4 flex items-end justify-between gap-3 sm:block">
          <strong data-type="number" className="block text-[26px] font-semibold tracking-[-0.045em]">{value}</strong>
          <span className="mb-1 block text-[12px] text-[#667085] sm:mb-0 sm:mt-1">{label}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export { MetricCard };
