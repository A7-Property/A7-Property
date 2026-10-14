import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "default" | "icon";
};

function Button({ className, variant = "default", size = "default", type = "button", ...props }: ButtonProps) {
  return (
    <button
      data-slot="button"
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 font-semibold tracking-[-0.005em] transition-[color,background-color,border-color,box-shadow,transform] duration-[var(--duration-base)] ease-[var(--ease-standard)] outline-none focus-visible:ring-4 focus-visible:ring-a7-blue/20 active:scale-[.985] disabled:pointer-events-none disabled:opacity-45",
        variant === "default" && "bg-a7-blue text-white shadow-[var(--shadow-action)] hover:bg-[#0E2F5C] hover:shadow-[0_8px_22px_rgba(18,59,115,.22)]",
        variant === "secondary" && "bg-[#DCEBFF] text-a7-blue shadow-[var(--shadow-hairline)] hover:bg-[#CFE2FC]",
        variant === "ghost" && "bg-transparent text-a7-navy hover:bg-[#DCEBFF]",
        variant === "outline" && "border border-a7-line bg-[#F8FBFF] text-a7-navy shadow-[var(--shadow-hairline)] hover:border-[#4DA3FF] hover:bg-[#F8FBFF] hover:text-a7-blue",
        variant === "destructive" && "bg-[var(--status-danger-text)] text-white shadow-[0_6px_18px_rgba(180,35,24,.18)] hover:bg-[#912018]",
        size === "default" && "h-11 rounded-[var(--radius-control)] px-4 text-sm",
        size === "icon" && "size-11 min-w-11 rounded-[var(--radius-control)]",
        className,
      )}
      {...props}
    />
  );
}

export { Button };
export type { ButtonProps };
