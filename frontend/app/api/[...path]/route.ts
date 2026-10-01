import { NextResponse } from "next/server";
import { requireUser } from "../_lib/auth";
import { proxyToBackend, workerOffline } from "../_lib/backend";
import {
  DatabaseOfflineError,
  getHealth,
  getSettings,
  getStats,
  getStrategistInsights,
  saveSettings,
} from "../_lib/data";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ path: string[] }> };

async function handle(request: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  const route = "/api/" + path.join("/");
  const method = request.method;

  // Auth gate first — settings hold API keys, nothing here is public.
  const auth = await requireUser();
  if (auth.response) return auth.response;

  // A deployed worker, when configured, serves everything.
  const proxied = await proxyToBackend(request, route);
  if (proxied) return proxied;

  try {
    switch (`${method} ${route}`) {
      case "GET /api/stats":
        return NextResponse.json(await getStats());
      case "GET /api/strategist-insights":
        return NextResponse.json(await getStrategistInsights());
      case "GET /api/health":
        return NextResponse.json(await getHealth());
      case "GET /api/settings":
        return NextResponse.json(await getSettings());
      case "POST /api/settings": {
        const body = await request.json().catch(() => ({}));
        await saveSettings(body);
        return NextResponse.json({ success: true, message: "Settings saved successfully." });
      }
      case "GET /api/connection-status":
        return NextResponse.json({ workerDeployed: false, database: "see /api/health" });

      // Worker-only endpoints.
      case "GET /api/stress-results":
      case "GET /api/deployment-status":
        return NextResponse.json({ workerOffline: true, error: "Automation worker not deployed." }, { status: 404 });
      case "POST /api/post-now":
        return workerOffline("Generating a Reel");
      case "POST /api/sync-stats":
        return workerOffline("Syncing Instagram insights");
      case "POST /api/run-stress-test":
        return workerOffline("Running the stress test");
      case "POST /api/run-backup":
        return workerOffline("Running a backup");

      default:
        return NextResponse.json({ error: `No handler for ${method} ${route}` }, { status: 404 });
    }
  } catch (error: any) {
    if (error instanceof DatabaseOfflineError) {
      return NextResponse.json({ error: "Database offline", details: error.message }, { status: 503 });
    }
    console.error(`[api] ${method} ${route} failed:`, error);
    return NextResponse.json({ error: error?.message || "Internal error" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
