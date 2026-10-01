import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

// Handles every Supabase email link (signup confirmation, magic link,
// password recovery, email change). Supports both the PKCE `?code=` flow and
// the `?token_hash=&type=` flow, then redirects to `next`.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? "/dashboard";
  // Only allow same-origin relative redirects.
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  const supabase = await createClient();
  let errorMessage: string | null = null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    errorMessage = error?.message ?? null;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    errorMessage = error?.message ?? null;
  } else {
    errorMessage = "Missing confirmation code.";
  }

  if (errorMessage) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", errorMessage);
    return NextResponse.redirect(url);
  }

  // Password recovery links should land on the reset form.
  const destination = type === "recovery" ? "/reset-password" : next;
  return NextResponse.redirect(new URL(destination, origin));
}
