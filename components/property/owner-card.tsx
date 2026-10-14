import { CalendarDays, Clock3, MessageCircle, ShieldCheck, Star } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { PropertyOwner } from "@/lib/properties";

interface OwnerCardProps {
  owner: PropertyOwner;
  onContact: () => void;
  onSchedule: () => void;
}

function OwnerCard({ owner, onContact, onSchedule }: OwnerCardProps) {
  const initials = owner.name.split(" ").map((part) => part[0]).slice(0, 2).join("");
  return (
    <section className="rounded-[20px] border border-[#D0DEF0] bg-[#F8FBFF] p-5 shadow-[0_4px_20px_rgba(16,24,40,.07)]" aria-labelledby="owner-card-title">
      <div className="flex items-center gap-4">
        <Avatar initials={initials} className="size-16 bg-[#DCEBFF] text-lg text-[#123B73]" />
        <div className="min-w-0 flex-1">
          <h2 id="owner-card-title" className="truncate text-[17px] font-semibold tracking-[-0.025em] text-[#101828]">{owner.name}</h2>
          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#123B73]"><ShieldCheck className="size-3.5" />{owner.phone_verified ? (owner.type === "agent" ? "Phone-verified agent" : "Phone-verified owner") : "Phone not verified"}</span>
          <div className="mt-1.5 flex items-center gap-1 text-[9px] text-[#667085]"><Star className="size-3 fill-[#123B73] text-[#123B73]" />4.9 · 24 successful viewings</div>
        </div>
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-[16px] bg-[#EAF4FF] p-3 text-[10px] leading-5 text-[#101828]"><Clock3 className="mt-0.5 size-4 shrink-0 text-[#123B73]" /><span>Usually replies within <strong className="font-semibold text-[#101828]">{owner.response_time_minutes} minutes</strong></span></div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onContact} className="h-12 rounded-[14px] border-[#D0DEF0] bg-[#F8FBFF] text-[11px] !text-[#123B73]"><MessageCircle className="size-4" />Message</Button>
        <Button onClick={onSchedule} className="h-12 rounded-[14px] bg-[#123B73] px-3 text-[11px] !text-white hover:bg-[#0E2F5C]"><CalendarDays className="size-4" />Schedule viewing</Button>
      </div>
      <p className="mt-3 text-center text-[9px] leading-4 text-[#667085]">Your contact details stay private until you send an inquiry.</p>
    </section>
  );
}

export { OwnerCard };
