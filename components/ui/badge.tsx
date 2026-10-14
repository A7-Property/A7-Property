import * as React from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "neutral" | "brand" | "success" | "warning" | "danger" | "verified";

type BadgeProps = React.ComponentProps<"span"> & {
  variant?: BadgeVariant;
};

function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex min-h-6 items-center justify-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap",
        variant === "neutral" && "bg-[#EEF1F4] text-[#526172]",
        variant === "brand" && "bg-[#DCEBFF] text-[#123B73]",
        variant === "success" && "bg-[var(--status-success-surface)] text-[var(--status-success-text)]",
        variant === "warning" && "bg-[var(--status-warning-surface)] text-[var(--status-warning-text)]",
        variant === "danger" && "bg-[var(--status-danger-surface)] text-[var(--status-danger-text)]",
        variant === "verified" && "border border-white/70 bg-[#F8FBFF]/90 text-[#123B73] shadow-sm backdrop-blur-md",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
export type { BadgeProps, BadgeVariant };
