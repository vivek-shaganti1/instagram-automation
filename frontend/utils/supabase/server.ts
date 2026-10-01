import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

// Cookie-backed client for Server Components, Server Actions and Route Handlers.
// Uses the signed-in user's session, so RLS applies.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component: cookies can't be written there.
          // The middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

// Data client for /api routes. Callers MUST verify the user is authenticated
// first. With SUPABASE_SERVICE_ROLE_KEY set it bypasses RLS; otherwise it uses
// the signed-in user's session, which the `authenticated` RLS policies in
// backend/prisma/rls.sql allow through.
export async function createDataClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    return createSupabaseClient(getSupabaseUrl(), serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return createClient();
}
