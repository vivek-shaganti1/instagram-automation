export function getApiUrl(path: string = ""): string {
  if (typeof window !== "undefined") {
    // Relative paths work perfectly on client side due to next.config.js rewrites
    return path;
  }
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  return `${base}${path}`;
}
