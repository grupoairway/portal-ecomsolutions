import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from '@/lib/session';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/?error=token_missing', request.url));
  }

  // Verifica firma y caducidad del magic link (JWT, 24 h)
  const payload = await verifyToken(token);

  if (!payload || payload.type !== 'magic_link') {
    return NextResponse.redirect(new URL('/?error=token_invalid', request.url));
  }

  if (!payload.clienteId || !payload.email) {
    return NextResponse.redirect(new URL('/?error=token_invalid', request.url));
  }

  const sessionToken = await createSessionToken({
    clienteId: payload.clienteId,
    email: payload.email,
    nombre: payload.nombre || 'Cliente',
  });

  const response = NextResponse.redirect(new URL('/dashboard', request.url));
  response.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions());

  return response;
}
