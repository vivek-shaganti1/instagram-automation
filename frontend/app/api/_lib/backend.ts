import { NextResponse } from "next/server";

// The Express worker (Redis/BullMQ/FFmpeg) is optional for the web app. When
// BACKEND_URL (or NEXT_PUBLIC_API_URL) points at a deployed instance, API
// calls are proxied there. Otherwise read-only data comes straight from
// Supabase and job-triggering actions report the worker as offline.
export function getBackendUrl(): string | null {
  const raw = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "";
  if (!raw) return null;
  // Never try to reach a laptop-local backend from a deployed server.
  if (process.env.VERCEL && /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(raw)) return null;
  return raw.replace(/\/$/, "");
}

export async function proxyToBackend(request: Request, path: string): Promise<NextResponse | null> {
  const base = getBackendUrl();
  if (!base) return null;

  const incoming = new URL(request.url);
  const target = `${base}${path}${incoming.search}`;
  const init: RequestInit = {
    method: request.method,
    headers: { "Content-Type": request.headers.get("content-type") || "application/json" },
    signal: AbortSignal.timeout(15000),
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  try {
    const res = await fetch(target, init);
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: `Backend unreachable at ${base}: ${error?.message || "request failed"}` },
      { status: 502 }
    );
  }
}

export function workerOffline(action: string) {
  return NextResponse.json(
    {
      success: false,
      workerOffline: true,
      error: `${action} needs the automation worker (Redis + FFmpeg), which is not deployed. Run the backend and set BACKEND_URL to enable it.`,
    },
    { status: 503 }
  );
}
