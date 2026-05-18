import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeSession } from '@/lib/session';
import { getModelosCliente } from '@/lib/notion';

export async function GET(req: NextRequest) {
  const sessionCookie = cookies().get('portal_session');
  if (!sessionCookie) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const session = decodeSession(sessionCookie.value);
  if (!session) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

  const clienteId = req.nextUrl.searchParams.get('clienteId') ?? session.clienteId;
  const modelos = await getModelosCliente(clienteId);
  return NextResponse.json(modelos);
}
