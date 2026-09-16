import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/session';
import { parseBalance, parsePyG } from '@/lib/excel-parser';

export async function POST(request: NextRequest) {
  const payload = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!payload) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const archivo = formData.get('archivo') as File | null;
    const tipo = formData.get('tipo') as string | null;

    if (!archivo || !tipo) {
      return NextResponse.json({ error: 'Archivo y tipo requeridos' }, { status: 400 });
    }

    if (!['balance', 'pyg'].includes(tipo)) {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }

    const bytes = await archivo.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (tipo === 'balance') {
      const data = parseBalance(buffer);
      return NextResponse.json({ success: true, tipo: 'balance', metricas: data.metricas, data });
    } else {
      const data = parsePyG(buffer);
      return NextResponse.json({ success: true, tipo: 'pyg', metricas: data.metricas, data });
    }
  } catch (error) {
    console.error('Error procesando Excel:', error);
    return NextResponse.json({ error: 'Error al procesar el archivo' }, { status: 500 });
  }
}
