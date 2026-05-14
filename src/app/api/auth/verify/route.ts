import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, generateSessionToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/?error=token_missing', request.url));
  }

  const payload = await verifyToken(token);

  if (!payload || payload.type !== 'magic_link') {
    return NextResponse.redirect(new URL('/?error=token_invalid', request.url));
  }

  const sessionToken = await generateSessionToken({
    clienteId: payload.clienteId,
    email: payload.email,
    nombre: payload.nombre,
  });

  const response = NextResponse.redirect(new URL('/dashboard', request.url));

  response.cookies.set('portal_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });

  return response;
}
