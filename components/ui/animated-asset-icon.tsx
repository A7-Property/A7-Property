import Image from "next/image";

import { cn } from "@/lib/utils";

type AssetIconHover = "none" | "tilt" | "float";
type AssetIconEntrance = "none" | "pop";

interface AnimatedAssetIconProps {
  src: string;
  alt?: string;
  width: number;
  height: number;
  hover?: AssetIconHover;
  entrance?: AssetIconEntrance;
  className?: string;
  imageClassName?: string;
  unoptimized?: boolean;
  preload?: boolean;
}

function AnimatedAssetIcon({
  src,
  alt = "",
  width,
  height,
  hover = "tilt",
  entrance = "pop",
  className,
  imageClassName,
  // These source-owned 3D icons are already compact 256px PNG assets. Serving
  // them directly also avoids unsupported custom-width requests in the vinext
  // production image endpoint (for example 52px, 72px, or 80px icons).
  unoptimized = true,
  preload = false,
}: AnimatedAssetIconProps) {
  return (
    <span
      data-animated-asset-icon
      className={cn("a7-asset-icon relative inline-grid shrink-0 place-items-center", entrance === "pop" && "a7-asset-icon--pop", hover !== "none" && `a7-asset-icon--${hover}`, className)}
      style={{ transformStyle: "preserve-3d" }}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        unoptimized={unoptimized}
        preload={preload}
        draggable={false}
        className={cn("pointer-events-none size-full object-contain", imageClassName)}
      />
    </span>
  );
}

export { AnimatedAssetIcon };
export type { AnimatedAssetIconProps, AssetIconEntrance, AssetIconHover };
