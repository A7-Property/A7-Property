import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const localDevOrigins = Object.values(networkInterfaces())
  .flatMap((interfaces) => interfaces ?? [])
  .filter((details) => details.family === "IPv4" && !details.internal)
  .map((details) => details.address);

const nextConfig: NextConfig = {
  // vinext owns .next/types; keep native Next output and validators separate.
  distDir: ".next-native",
  allowedDevOrigins: localDevOrigins,
  output: process.env.CAPACITOR_BUILD === "1" ? "export" : undefined,
  images: {
    unoptimized: process.env.CAPACITOR_BUILD === "1" ? true : undefined,
    dangerouslyAllowLocalIP: true,
    // Uploaded media is served at the API origin, outside its /api/v1 prefix.
    remotePatterns: [new URL("/media/**", process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000")],
  },
};

export default nextConfig;
