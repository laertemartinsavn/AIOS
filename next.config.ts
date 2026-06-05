import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    APP_VERSION: process.env.npm_package_version ?? "0.1.0",
    BUILD_DATE: new Date().toISOString(),
  },
};

export default nextConfig;
