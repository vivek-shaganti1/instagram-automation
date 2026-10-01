import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/analytics/:path*",
    "/settings/:path*",
    "/library/:path*",
    "/admin/:path*",
    "/login",
    "/signup",
  ],
};
