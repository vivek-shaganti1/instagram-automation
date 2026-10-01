const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, '..'),
  // /api/* is served by app/api/[...path]/route.ts, which proxies to the
  // worker when BACKEND_URL is set and reads Supabase directly otherwise.
};

module.exports = nextConfig;
