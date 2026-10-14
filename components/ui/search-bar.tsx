import { Search } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

interface SearchBarProps extends Omit<React.ComponentProps<"form">, "onSubmit"> {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit?: () => void;
  label: string;
  placeholder?: string;
  trailing?: React.ReactNode;
}

function SearchBar({ value, onValueChange, onSubmit, label, placeholder, trailing, className, ...props }: SearchBarProps) {
  return (
    <form
      role="search"
      className={cn("flex min-h-12 min-w-0 items-center gap-2 rounded-[var(--radius-control)] border border-a7-line bg-[#F8FBFF] px-4 shadow-[var(--shadow-hairline)] transition-[border-color,box-shadow] duration-[var(--duration-base)] focus-within:border-a7-blue focus-within:shadow-[0_0_0_3px_rgba(18,59,115,.1)]", className)}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
      {...props}
    >
      <Search className="size-[18px] shrink-0 text-a7-blue" aria-hidden="true" />
      <input
        data-focus-ring="parent"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        aria-label={label}
        placeholder={placeholder}
        className="min-h-11 min-w-0 flex-1 bg-transparent text-[14px] text-a7-navy outline-none placeholder:text-[#667085]"
      />
      {trailing}
    </form>
  );
}

export { SearchBar };
export type { SearchBarProps };
