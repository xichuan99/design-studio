import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  generateBuildId: async () => {
    // This allows us to manually pass a build ID or default to a git hash/timestamp in the Dockerfile
    return process.env.NEXT_PUBLIC_BUILD_ID || process.env.VERCEL_GIT_COMMIT_SHA || `dev-${Date.now()}`;
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.backblazeb2.com" },
      { protocol: "https", hostname: "fal.media" },
      { protocol: "https", hostname: "**.fal.ai" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: "placeholder-org",
  project: "placeholder-project",
});
