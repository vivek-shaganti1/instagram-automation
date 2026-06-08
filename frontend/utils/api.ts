export function getApiUrl(path: string = ""): string {
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  if (!base && typeof window !== "undefined") {
    // Dynamically fallback to port 8000 of current hostname (works for localhost, 127.0.0.1, or local IP)
    return `http://${window.location.hostname}:8000${path}`;
  }
  return `${base}${path}`;
}
