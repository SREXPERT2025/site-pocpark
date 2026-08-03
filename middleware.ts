import { NextResponse, type NextRequest } from 'next/server';

const previewOnlyRoutes = [
  '/proshche',
  '/puzzle',
  '/test2',
  '/v4-1',
  '/v4-2',
];

export function middleware(request: NextRequest) {
  if (process.env.ROSPARK_LANDING_RUNTIME_MODE !== 'production') {
    return NextResponse.next();
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
  ],
};

