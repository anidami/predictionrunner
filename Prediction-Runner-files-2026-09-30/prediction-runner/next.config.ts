import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  serverExternalPackages: ["@anchor-lang/core"],
  devIndicators: false,
};
export default nextConfig;
