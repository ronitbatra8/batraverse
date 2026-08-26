import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "wwd.com" },
      { protocol: "https", hostname: "thumbs.dreamstime.com" },
    ],
  },
};

export default nextConfig;
