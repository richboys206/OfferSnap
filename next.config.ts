import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        "localhost:3002",
        "127.0.0.1:3002",
        "wdf6w4x4-3002.brs.devtunnels.ms",
      ],
    },
  },
};

export default nextConfig;