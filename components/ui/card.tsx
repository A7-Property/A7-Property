import * as React from "react";

import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("flex min-w-0 flex-col rounded-[var(--radius-card)] border border-a7-line bg-[#F8FBFF] text-a7-navy shadow-[var(--shadow-soft)]", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("min-w-0 p-5 sm:p-6", className)} {...props} />;
}

export { Card, CardContent };
