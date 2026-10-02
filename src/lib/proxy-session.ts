import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isValidRefCode, REF_COOKIE } from "./handle";

type CookieItem = { name: string; value: string; options?: Record<string, unknown> };
type ClientFactory = (cfg: { getAll: () => { name: string; value: string }[]; setAll: (list: CookieItem[]) => void }) => {
  auth: { getUser: () => Promise<unknown> };
};

const defaultFactory: ClientFactory = (cookies) =>
  createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!, { cookies }) as unknown as ReturnType<ClientFactory>;

/**
 * Refreshes the Supabase session on every matched request and writes any rotated cookies to both the
 * request (so Server Components see them) and the response (so the browser keeps them). Authorization is
 * decided by getUser(), never by getSession(). Also captures ?ref=CODE into a 30-day cookie.
 */
export async function handleProxy(request: NextRequest, deps: { createClient?: ClientFactory } = {}): Promise<NextResponse> {
  let res = NextResponse.next({ request });
  try {
    const supabase = (deps.createClient ?? defaultFactory)({
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        res = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    });
    await supabase.auth.getUser();
  } catch {
    // A failed refresh must never break the page; the request continues as signed out.
  }
  const ref = request.nextUrl.searchParams.get("ref");
  if (ref && isValidRefCode(ref)) {
    res.cookies.set(REF_COOKIE, ref, {
      path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax", httpOnly: false,
      secure: request.nextUrl.protocol === "https:",
    });
  }
  return res;
}
