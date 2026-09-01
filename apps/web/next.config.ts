import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The shared contract ships as TypeScript source inside the monorepo.
  transpilePackages: ["@eventreport/schema"],
  // Vercel needs the monorepo root to trace files correctly.
  outputFileTracingRoot: path.join(import.meta.dirname, "../../"),
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
};

export default nextConfig;
