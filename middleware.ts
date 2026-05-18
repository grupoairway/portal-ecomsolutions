import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/', '/auth/verify', '/api/auth/request', '/api/auth/verify', '/api/test-email', '/dashboard-demo'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const session = request.cookies.get('portal_session');

  if (!session) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    const data = JSON.parse(Buffer.from(session.value, 'base64').toString());
    if (!data.clienteId || !data.email) throw new Error('invalid');
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete('portal_session');
    return response;
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/upload/:path*', '/api/test-email'],
};
