import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { ACCESS_DENIED_MESSAGE, isEmailAllowed } from "@/utils/access";

// Every /api route is behind a login. Returns the user or a ready 401/503.
export async function requireUser(): Promise<
  { user: { id: string; email?: string }; response?: undefined } | { user?: undefined; response: NextResponse }
> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return { response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
    }
    if (!isEmailAllowed(data.user.email)) {
      return { response: NextResponse.json({ error: ACCESS_DENIED_MESSAGE }, { status: 403 }) };
    }
    return { user: { id: data.user.id, email: data.user.email } };
  } catch (error: any) {
    return {
      response: NextResponse.json(
        { error: "Authentication service unreachable. The Supabase project may be paused.", details: error?.message },
        { status: 503 }
      ),
    };
  }
}
