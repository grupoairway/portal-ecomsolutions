import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session-server';
import { getModelosCliente } from '@/lib/notion';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const clienteId = req.nextUrl.searchParams.get('clienteId') ?? session.clienteId;
  const modelos = await getModelosCliente(clienteId);
  return NextResponse.json(modelos);
}
