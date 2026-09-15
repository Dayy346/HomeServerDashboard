import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";


const root = path.dirname(fileURLToPath(import.meta.url));


const nextConfig: NextConfig = {
  output: "standalone",
  // `make dev` is commonly opened from another device on the homelab. Allow
  // the server's LAN address so Next's development client can connect too.
  allowedDevOrigins: ["10.0.0.223"],
  turbopack: {
    root,
  },
};

export default nextConfig;
