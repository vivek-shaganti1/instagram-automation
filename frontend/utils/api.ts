// All API calls go through this app's own /api routes (same origin), which
// handle auth and talk to Supabase or the optional worker backend.
export function getApiUrl(path: string = ""): string {
  return path;
}
