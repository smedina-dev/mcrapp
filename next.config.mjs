import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** @type {import('next').NextConfig} */
const nextConfig = (phase) => ({
  poweredByHeader: false,
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev-local" : ".next",
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
});

export default nextConfig;