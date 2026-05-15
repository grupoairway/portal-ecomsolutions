import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/?error=token_missing', request.url));
  }

  let payload: { clienteId: string; email: string; nombre: string; exp: number };
  try {
    payload = JSON.parse(Buffer.from(token, 'base64').toString());
  } catch {
    return NextResponse.redirect(new URL('/?error=token_invalid', request.url));
  }

  if (!payload.clienteId || !payload.email || !payload.exp) {
    return NextResponse.redirect(new URL('/?error=token_invalid', request.url));
  }

  if (Date.now() > payload.exp) {
    return NextResponse.redirect(new URL('/?error=token_expired', request.url));
  }

  const sessionData = JSON.stringify({
    clienteId: payload.clienteId,
    email: payload.email,
    nombre: payload.nombre || 'Cliente',
    createdAt: Date.now(),
  });
  const sessionToken = Buffer.from(sessionData).toString('base64');

  const response = NextResponse.redirect(new URL('/dashboard', request.url));

  response.cookies.set('portal_session', sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 días
    path: '/',
  });

  return response;
}
