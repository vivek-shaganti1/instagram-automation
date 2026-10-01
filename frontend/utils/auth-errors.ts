// Turns raw Supabase/network errors into something a user can act on.
export function friendlyAuthError(error: unknown): string {
  const message =
    typeof error === "string"
      ? error
      : (error as { message?: string })?.message || "Something went wrong.";

  if (/failed to fetch|networkerror|load failed|fetch failed/i.test(message)) {
    return "Can't reach the authentication server. The Supabase project may be paused or offline — please try again in a minute.";
  }
  if (/invalid login credentials/i.test(message)) {
    return "Incorrect email or password.";
  }
  if (/email not confirmed/i.test(message)) {
    return "Please confirm your email first — check your inbox for the confirmation link.";
  }
  return message;
}
