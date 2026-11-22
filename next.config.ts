import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/dashboard/projects/\\[repositoryId\\]/setup/\\[file\\]": [
      "./lib/ci/setup/*.yml", "./.github/workflows/effictiv-workloads.yml", "./scripts/capture-eco-ci.mjs",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
