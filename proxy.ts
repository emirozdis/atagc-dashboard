import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { ADMIN_ROLES, DASHBOARD_ROLES, ORGANISATION_ROLES, OBSERVER_TEAM, PRESS_TEAM, SECURITY_TEAM, UserRole, getEffectiveRole } from "@/lib/roles";

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isLoginPage = req.nextUrl.pathname.startsWith("/login");

    // Redirect role-specific shared routes to their root equivalents (excluding /admin)
    const sharedPaths = [
        "/profile", "/payment", "/connections", "/announcements",
        "/catering", "/tickets", "/resources", "/my-application", "/gallery"
    ];
    const prefixes = ["/dashboard", "/organisation"];

    for (const prefix of prefixes) {
        for (const sharedPath of sharedPaths) {
            const targetPath = `${prefix}${sharedPath}`;
            if (req.nextUrl.pathname === targetPath || req.nextUrl.pathname.startsWith(`${targetPath}/`)) {
                const newPathname = req.nextUrl.pathname.replace(prefix, "");
                return NextResponse.redirect(new URL(newPathname + req.nextUrl.search, req.url));
            }
        }
    }

    // Define base paths
    const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
    const isPortalRoute = req.nextUrl.pathname.startsWith("/portal");
    const isDashboardRoute = req.nextUrl.pathname.startsWith("/dashboard");
    const isOrganisationRoute = req.nextUrl.pathname.startsWith("/organisation");

    if (req.nextUrl.pathname === "/dashboard" || req.nextUrl.pathname === "/organisation") {
      return NextResponse.redirect(new URL("/portal", req.url));
    }
    if (req.nextUrl.pathname === "/dashboard/delegation") {
      return NextResponse.redirect(new URL("/portal/delegation", req.url));
    }

    // Define Shared/Common routes that any authenticated user can access
    const isSharedRoute = [
        "/profile", "/payment", "/connections", "/announcements",
        "/catering", "/tickets", "/resources", "/my-application", "/gallery"
    ].some(path => req.nextUrl.pathname.startsWith(path));

    // 1. Handle Login Page
    if (isLoginPage) {
      if (isAuth) {
        const effectiveRole = getEffectiveRole(token);
        
        if (ADMIN_ROLES.includes(effectiveRole)) {
          return NextResponse.redirect(new URL("/admin", req.url));
        } else {
          return NextResponse.redirect(new URL("/portal", req.url));
        }
      }
      return null;
    }

    if (!isAuth) {
      let from = req.nextUrl.pathname;
      if (req.nextUrl.search) {
        from += req.nextUrl.search;
      }
      return NextResponse.redirect(
        new URL(`/login?callbackUrl=${encodeURIComponent(from)}`, req.url)
      );
    }

    // RavenMUN uses one authenticated, role-aware participant portal.
    if (isPortalRoute) return null;

    // Determine the user's role including their targeted application type
    const effectiveRole = getEffectiveRole(token);

    // If it's a shared route, let them in based solely on authentication
    if (isSharedRoute) {
        return null;
    }

    // 2. Protect /admin
    if (isAdminRoute) {
      if (!ADMIN_ROLES.includes(effectiveRole)) {
        if (ORGANISATION_ROLES.includes(effectiveRole)) return NextResponse.redirect(new URL("/portal", req.url));
        return NextResponse.redirect(new URL("/portal", req.url));
      }
    }

    // 3. Protect /dashboard (Academic specific)
    if (isDashboardRoute) {
      if (!DASHBOARD_ROLES.includes(effectiveRole)) {
        // Site administrators may inspect committee documents from the admin panel.
        if (ADMIN_ROLES.includes(effectiveRole) && req.nextUrl.pathname === "/dashboard/editor") return null;
        if (ADMIN_ROLES.includes(effectiveRole)) return NextResponse.redirect(new URL("/admin", req.url));
        if (ORGANISATION_ROLES.includes(effectiveRole)) return NextResponse.redirect(new URL("/portal", req.url));
      }
    }

    // 4. Protect /organisation
    if (isOrganisationRoute) {
      if (!ORGANISATION_ROLES.includes(effectiveRole) && !ADMIN_ROLES.includes(effectiveRole)) {
        return NextResponse.redirect(new URL("/portal", req.url));
      }

      if (ADMIN_ROLES.includes(effectiveRole)) {
        return NextResponse.redirect(new URL("/admin", req.url));
      }

      // Sub-section team enforcement
      const path = req.nextUrl.pathname;
      if (path.startsWith("/organisation/observers") && !OBSERVER_TEAM.includes(effectiveRole)) {
        return NextResponse.redirect(new URL("/portal", req.url));
      }
      if (path.startsWith("/organisation/press") && !PRESS_TEAM.includes(effectiveRole)) {
        return NextResponse.redirect(new URL("/portal", req.url));
      }
      if (path.startsWith("/organisation/security") && !SECURITY_TEAM.includes(effectiveRole)) {
        return NextResponse.redirect(new URL("/portal", req.url));
      }
    }

    return null;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (req.nextUrl.pathname.startsWith("/login")) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
      "/dashboard/:path*", 
      "/portal/:path*",
      "/admin/:path*", 
      "/organisation/:path*", 
      "/login",
      "/profile", 
      "/payment", 
      "/connections", 
      "/announcements", 
      "/catering", 
      "/tickets", 
      "/resources", 
      "/my-application",
      "/gallery"
  ],
};
