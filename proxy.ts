import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  customerRoutePrefixes,
  adminRoutePrefixes,
  superAdminRoutePrefixes,
  getAppAreaFromPath,
  getDefaultAppPath,
  matchesRoutePrefix,
  canAccessArea,
} from "@/lib/role-routing";

const protectedPrefixes = [
  ...customerRoutePrefixes,
  ...adminRoutePrefixes,
  ...superAdminRoutePrefixes,
  "/auth/complete",
] as const;

const publicOnlyPrefixes = ["/sign-in", "/sign-up", "/forgot-password"] as const;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const isAuthenticated = Boolean(token?.sub);
  const role = ((token as { role?: string } | null)?.role ?? "USER") as
    | "USER"
    | "ADMIN"
    | "SUPERADMIN";

  const isProtected = protectedPrefixes.some((prefix) => matchesRoutePrefix(pathname, prefix));
  const isPublicOnly = publicOnlyPrefixes.some((prefix) => matchesRoutePrefix(pathname, prefix));

  if (isProtected && !isAuthenticated) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(signInUrl);
  }

  if (isPublicOnly && isAuthenticated) {
    return NextResponse.redirect(new URL(getDefaultAppPath(role), request.url));
  }

  if (isAuthenticated) {
    const area = getAppAreaFromPath(pathname);

    if (!canAccessArea(role, area)) {
      return NextResponse.redirect(new URL(getDefaultAppPath(role), request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/onboarding/:path*",
    "/workouts/:path*",
    "/nutrition/:path*",
    "/progress/:path*",
    "/coach/:path*",
    "/coach-call/:path*",
    "/billing/:path*",
    "/admin/:path*",
    "/superadmin/:path*",
    "/auth/complete/:path*",
    "/sign-in/:path*",
    "/sign-up/:path*",
    "/forgot-password/:path*",
  ],
};
