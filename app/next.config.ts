import type { NextConfig } from "next";
import path from "path";

// __dirname here = .../stoki/app. Going one level up lands on the stoki repo
// root, which has its own package.json + lockfile (the npm workspace root).
// Setting both keys silences the auto-detection warnings on whichever bundler
// is in use (Turbopack vs webpack) and stops Next from picking up the unrelated
// lockfile in the user's home directory.
const repoRoot = path.resolve(__dirname, "..");

const nextConfig: NextConfig = {
  turbopack: { root: repoRoot },
  outputFileTracingRoot: repoRoot,
};

export default nextConfig;
