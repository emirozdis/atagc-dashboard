import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isLoginPage = req.nextUrl.pathname.startsWith("/login");
    const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");

    // 1. Handle Login Page
    if (isLoginPage) {
      if (isAuth) {
        // If already logged in, redirect to the appropriate dashboard based on role
        if (token.role === "superadmin") {
          return NextResponse.redirect(new URL("/admin", req.url));
        }
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return null;
    }

    // 2. Protect Admin Routes
    if (isAdminRoute) {
      const allowedAdminRoles = ["superadmin"];
      if (!token?.role || !allowedAdminRoles.includes(token.role as string)) {
        // If not an admin role, redirect to participant dashboard (or 403 page)
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return null; // Admin is allowed
    }

    // 3. Protect generic Dashboard Routes (Participant View)
    // 3. Protect generic Dashboard Routes (Participant View)
    if (!isAuth) {
      let from = req.nextUrl.pathname;
      if (req.nextUrl.search) {
        from += req.nextUrl.search;
      }
      return NextResponse.redirect(
        new URL(`/login?callbackUrl=${encodeURIComponent(from)}`, req.url)
      );
    }

    // 4. Redirect Superadmin from Dashboard to Admin
    if (req.nextUrl.pathname.startsWith("/dashboard") && token?.role === "superadmin") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Always allow access to login page
        if (req.nextUrl.pathname.startsWith("/login")) {
          return true;
        }
        // For protected routes, require a token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login"],
};