import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  images: { remotePatterns: [] },
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|ico|woff|woff2|ttf)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

