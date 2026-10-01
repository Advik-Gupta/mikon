import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionClaims } from "@/lib/server/session";

const PUBLIC = ["/login", "/signup", "/forgot-password", "/reset-password"];

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const claims = await sessionClaims(req.cookies.get(SESSION_COOKIE)?.value, process.env.JWT_SECRET ?? "");
  const userId = claims?.sub ?? null;
  if (pathname.startsWith("/admin") && claims?.role !== "admin") return NextResponse.redirect(new URL(userId ? "/" : "/login", req.url));
  const isPublic = PUBLIC.includes(pathname);

  if (!userId && !isPublic) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (userId && isPublic && pathname !== "/reset-password") return NextResponse.redirect(new URL("/", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|offline\\.html|.*\\.(?:png|jpg|svg|ico|json|txt|js|webmanifest|html)$).*)"],
};
