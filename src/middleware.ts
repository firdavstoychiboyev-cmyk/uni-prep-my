import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public paths that never require authentication
const PUBLIC_PATHS = ["/", "/login", "/onboarding"];

function isPublic(pathname: string): boolean {
    if (PUBLIC_PATHS.includes(pathname)) return true;
    if (pathname.startsWith("/auth/")) return true;
    return false;
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // All public paths pass through unconditionally
    if (isPublic(pathname)) {
        return NextResponse.next();
    }

    // For all other routes, pass through.
    // Actual auth enforcement is client-side (auth-provider + dashboard layout)
    // because Firebase auth state lives in the browser, not in edge cookies.
    return NextResponse.next();
}

export const config = {
    matcher: [
        // Run middleware on all paths except Next.js internals and static files
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|otf)).*)",
    ],
};
