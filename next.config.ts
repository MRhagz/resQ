import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@emurgo/cardano-serialization-lib-nodejs',
  ],
};

export default nextConfig;
