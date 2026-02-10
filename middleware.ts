import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

const PUBLIC_PATHS = ["/login", "/forgot-password", "/set-password"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isLocalePrefixed(pathname: string) {
  return routing.locales.some(
    (locale) =>
      pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
}

function stripLocale(pathname: string) {
  for (const locale of routing.locales) {
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(`/${locale}`.length);
    }
    if (pathname === `/${locale}`) {
      return "/";
    }
  }
  return pathname;
}

export async function middleware(request: NextRequest) {
  // Run next-intl middleware first for locale handling
  const intlResponse = intlMiddleware(request);

  // Run Supabase session refresh
  const { user, supabaseResponse } = await updateSession(request);

  // Merge cookies from Supabase into the intl response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value);
  });

  const pathname = request.nextUrl.pathname;
  const strippedPath = isLocalePrefixed(pathname)
    ? stripLocale(pathname)
    : pathname;

  // Route protection: redirect unauthenticated users from dashboard routes to login
  const isDashboardRoute =
    strippedPath.startsWith("/admin") ||
    strippedPath.startsWith("/portal") ||
    strippedPath === "/";
  const isAuthRoute = isPublicPath(strippedPath);

  if (!user && isDashboardRoute && strippedPath !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth routes to dashboard
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return intlResponse;
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
