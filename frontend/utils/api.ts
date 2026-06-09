export function getApiUrl(path: string = ""): string {
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  if (!base && typeof window !== "undefined") {
    // Only dynamically fallback to port 8000 on localhost
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return `http://${window.location.hostname}:8000${path}`;
    }
    // On production (e.g. Vercel) if no env var is set, return relative path 
    // to avoid HTTP mixed content errors. Note: You must either set NEXT_PUBLIC_API_URL
    // in Vercel or have an API route/rewrite configured to handle this.
    return path;
  }
  return `${base}${path}`;
}
