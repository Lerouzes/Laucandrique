import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Temporary: allow production builds while legacy typing issues are being cleaned up.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
