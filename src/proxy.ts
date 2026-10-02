import type { NextRequest } from "next/server";
import { handleProxy } from "@/lib/proxy-session";

// Refreshes the Supabase session cookies and captures ?ref=CODE. Static assets are excluded by the matcher.
export async function proxy(request: NextRequest) {
  return handleProxy(request);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"] };
