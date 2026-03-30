import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Explicitly set the root to avoid scanning parent directories
  // based on the multiple lockfiles warning.
  // @ts-ignore - Turbopack root is supported at top level in some versions or via experimental
  turbopack: {
    root: path.resolve(__dirname),
  },
} as any;

export default nextConfig;
