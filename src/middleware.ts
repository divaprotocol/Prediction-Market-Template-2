import { NextFetchEvent, NextRequest, NextResponse } from 'next/server';

export const config = {
    matcher: [
        '/((?!_next/|_proxy/|_auth/|_root/|_static|static|_vercel|[\\w-]+\\.\\w+).*)',
    ],
};

export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
    const res = NextResponse.next();

    const cookieAuthToken = req.cookies.get('privy-token');
    const cookieSession = req.cookies.get('privy-session');

    if (req.nextUrl.searchParams.get('privy_oauth_code')) return NextResponse.next();

    // if (req.url.includes('/refresh')) return NextResponse.next();

    const definitelyAuthenticated = Boolean(cookieAuthToken);

    // If user has `privy-session`, they also have `privy-refresh-token` and
    // may be authenticated once their session is refreshed in the client
    const maybeAuthenticated = Boolean(cookieSession);

    // if (!definitelyAuthenticated && maybeAuthenticated) {
    //     // If user is not authenticated, but is maybe authenticated
    //     // redirect them to the `/refresh` page to trigger client-side refresh flow
    //     return NextResponse.redirect(new URL('/refresh', req.url));
    // }

    return NextResponse.next();
}