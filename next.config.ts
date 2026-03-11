import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },
  serverExternalPackages: ["@react-pdf/renderer"],
  turbopack: {},
};

export default nextConfig;
