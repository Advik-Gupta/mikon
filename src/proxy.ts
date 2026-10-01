import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/server/session";

const PUBLIC = ["/login", "/signup"];

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const userId = await verifySession(req.cookies.get(SESSION_COOKIE)?.value, process.env.JWT_SECRET ?? "");
  const isPublic = PUBLIC.includes(pathname);

  if (!userId && !isPublic) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (userId && isPublic) return NextResponse.redirect(new URL("/", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|offline\\.html|.*\\.(?:png|jpg|svg|ico|json|txt|js|webmanifest|html)$).*)"],
};
