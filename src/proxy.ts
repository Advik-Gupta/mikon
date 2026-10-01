import { NextResponse, type NextRequest } from "next/server";
import { KNOWN_COOKIE, REF_COOKIE, SESSION_COOKIE, sessionClaims } from "@/lib/server/session";

const PUBLIC = ["/login", "/signup", "/forgot-password", "/reset-password", "/welcome"];
const HANDLE = /^[a-z0-9_.]{3,24}$/;

function inviteRef(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("ref")?.toLowerCase();
  if (q && HANDLE.test(q)) return q;
  const m = req.nextUrl.pathname.match(/^\/u\/([^/]+)$/);
  const u = m?.[1].toLowerCase();
  return u && HANDLE.test(u) ? u : null;
}

function route(req: NextRequest, userId: string | null, role: string | undefined) {
  const { pathname, search } = req.nextUrl;
  if (pathname.startsWith("/admin") && role !== "admin") return NextResponse.redirect(new URL(userId ? "/" : "/login", req.url));
  const isPublic = PUBLIC.includes(pathname);
  if (!userId && pathname === "/") {
    if (req.cookies.get(KNOWN_COOKIE)) return NextResponse.redirect(new URL("/login", req.url));
    return NextResponse.rewrite(new URL(`/welcome${search}`, req.url));
  }
  if (!userId && !isPublic) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (userId && isPublic && pathname !== "/reset-password") return NextResponse.redirect(new URL("/", req.url));
  return NextResponse.next();
}

export async function proxy(req: NextRequest) {
  const claims = await sessionClaims(req.cookies.get(SESSION_COOKIE)?.value, process.env.JWT_SECRET ?? "");
  const userId = claims?.sub ?? null;
  const res = route(req, userId, claims?.role);
  const ref = userId ? null : inviteRef(req);
  if (ref) res.cookies.set(REF_COOKIE, ref, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|offline\\.html|.*\\.(?:png|jpg|svg|ico|json|txt|js|webmanifest|html)$).*)"],
};
