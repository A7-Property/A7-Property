import * as React from "react";

import { cn } from "@/lib/utils";

interface AvatarProps extends React.ComponentProps<"span"> {
  src?: string;
  alt?: string;
  initials?: string;
  size?: "sm" | "md" | "default" | "lg";
}

const avatarSizes = {
  sm: "size-8 text-[9px]",
  md: "size-12 text-sm",
  default: "size-12 text-sm",
  lg: "size-20 text-xl",
} as const;

function Avatar({ src, alt = "", initials, size = "md", className, children, ...props }: AvatarProps) {
  return (
    <span
      data-slot="avatar"
      className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#EEF5FC] font-semibold text-[#0057D9]", avatarSizes[size], className)}
      {...props}
    >
      {children ?? (src ? <AvatarImage src={src} alt={alt} /> : <AvatarFallback>{initials}</AvatarFallback>)}
    </span>
  );
}

function AvatarImage({ alt = "", className, onError, ...props }: React.ComponentProps<"img">) {
  return (
    // This slot intentionally uses a native image so failed remote avatars reveal the fallback beneath it.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-slot="avatar-image"
      alt={alt}
      className={cn("absolute inset-0 z-10 size-full object-cover", className)}
      onError={(event) => {
        event.currentTarget.hidden = true;
        onError?.(event);
      }}
      {...props}
    />
  );
}

function AvatarFallback({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="avatar-fallback" className={cn("grid size-full place-items-center", className)} {...props} />;
}

export { Avatar, AvatarFallback, AvatarImage };
export type { AvatarProps };
