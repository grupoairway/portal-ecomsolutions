import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/session';

const PUBLIC_PATHS = ['/', '/auth/verify', '/api/auth/request', '/api/auth/verify', '/dashboard-demo'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    // Las rutas de API devuelven 401; las páginas van al acceso
    const response = pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'No autenticado' }, { status: 401 })
      : NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/upload/:path*',
    '/api/modelos/:path*',
    '/api/borradores/:path*',
    '/api/quantum/:path*',
  ],
};
