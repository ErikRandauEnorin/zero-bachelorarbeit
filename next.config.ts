import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lean standalone server build for container deployments (Coolify/Docker).
  output: "standalone",
};

export default nextConfig;
