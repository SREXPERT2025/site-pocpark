import { NextResponse, type NextRequest } from 'next/server';

const previewOnlyRoutes = [
  '/proshche',
  '/puzzle',
  '/test2',
  '/v4-1',
  '/v4-2',
];

const canonicalProductionOrigin = 'https://www.xn--80aukedde.xn--p1ai';

export function middleware(request: NextRequest) {
  if (process.env.ROSPARK_LANDING_RUNTIME_MODE !== 'production') {
    return NextResponse.next();
  }

  if (
    request.nextUrl.pathname === '/puzzle2'
    || request.nextUrl.pathname.startsWith('/puzzle2/')
  ) {
    const destination = request.nextUrl.clone();
    destination.pathname = request.nextUrl.pathname.replace(
      /^\/puzzle2(?=\/|$)/,
      '/parkovka-pod-klyuch',
    );
    return NextResponse.redirect(destination, 308);
  }

  if (request.nextUrl.pathname === '/mobile/index.html') {
    const destination = new URL('/', canonicalProductionOrigin);
    destination.search = request.nextUrl.search;
    return NextResponse.redirect(destination, 308);
  }

  const isPreviewOnly = previewOnlyRoutes.some((route) => (
    request.nextUrl.pathname === route
    || request.nextUrl.pathname.startsWith(`${route}/`)
  ));
  if (!isPreviewOnly) return NextResponse.next();

  return new NextResponse('Not Found', {
    status: 404,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
    },
  });
}

export const config = {
  matcher: [
    '/proshche/:path*',
    '/puzzle/:path*',
    '/test2/:path*',
    '/v4-1/:path*',
    '/v4-2/:path*',
    '/puzzle2/:path*',
    '/mobile/index.html',
  ],
};
