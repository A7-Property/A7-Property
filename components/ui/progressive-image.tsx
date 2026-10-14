"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

interface ProgressiveImageProps extends ImageProps {
  skeletonClassName?: string;
}

function ProgressiveImage({ className, skeletonClassName, alt, onLoad, priority, loading, fetchPriority, ...props }: ProgressiveImageProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      <span className={cn("a7-image-skeleton pointer-events-none absolute inset-0 transition-opacity duration-500", loaded ? "opacity-0" : "opacity-100", skeletonClassName)} aria-hidden="true" />
      <Image
        {...props}
        alt={alt}
        loading={priority ? "eager" : loading}
        fetchPriority={priority ? "high" : fetchPriority}
        className={cn("transition-[filter,opacity,transform] duration-500 ease-out", loaded ? "blur-0 opacity-100" : "blur-[10px] opacity-70", className)}
        onLoad={(event) => {
          setLoaded(true);
          onLoad?.(event);
        }}
      />
    </>
  );
}

export { ProgressiveImage };
export type { ProgressiveImageProps };
