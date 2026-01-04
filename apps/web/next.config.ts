import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

console.log("NextConfig Loaded. Env Auth Secret Present:", !!process.env.AUTH_SECRET);

export default nextConfig;
