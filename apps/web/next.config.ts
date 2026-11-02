import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: [
    "@mnemosyne/ai",
    "@mnemosyne/database",
    "@mnemosyne/ingestion",
    "@mnemosyne/knowledge",
    "@mnemosyne/learning",
  ],
};

export default nextConfig;
