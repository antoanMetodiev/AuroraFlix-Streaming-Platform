import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Every image here (TMDB posters/backdrops, Clerk avatars, Cloudinary)
    // already comes pre-sized from its own CDN — lib/tmdb.ts's tmdbImage()
    // picks a TMDB width variant (w185/w342/.../original) per usage context,
    // same idea for the others. Next's own optimizer would otherwise proxy
    // every image through this app's server (browser -> Next server -> origin
    // CDN -> Next resizes/reencodes -> browser) for no real benefit on top of
    // that, just added latency — unoptimized skips the proxy entirely so the
    // browser fetches straight from the origin CDN.
    unoptimized: true,
    // 70 is the framework default; 40 is used for the heavily blurred/dimmed
    // page background, which doesn't need much fidelity to look right.
    qualities: [40, 70],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/dxkloyfs1/**",
      },
      {
        // Clerk's own avatar CDN — used both by useUser()'s imageUrl (see
        // CommentsSection's own comment form) and by comment authors'
        // avatars synced into lumo-user-svc's profileImageURL.
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],
  },
};

export default nextConfig;
