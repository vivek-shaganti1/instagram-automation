// Single-admin access control. Only these emails may use the app; everyone
// else is signed out at the middleware and rejected by every /api route.
// Override with a comma-separated ALLOWED_EMAILS env var on Vercel.
const DEFAULT_ALLOWED = ["admin@sparkv.com"];

export function allowedEmails(): string[] {
  const fromEnv = (process.env.ALLOWED_EMAILS || process.env.NEXT_PUBLIC_ALLOWED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return fromEnv.length ? fromEnv : DEFAULT_ALLOWED;
}

export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  return allowedEmails().includes(email.trim().toLowerCase());
}

export const ACCESS_DENIED_MESSAGE = "This account is not authorized to access AI Signal.";
