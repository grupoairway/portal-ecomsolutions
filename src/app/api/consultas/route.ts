import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const CONSULTAS_DB = '35f774ba27998070bf3bf1c9858f412c';

/*
 * Nombres reales de "BD - Consultas y emails". Antes se usaban "Fecha",
 * "Mensaje" y "Origen", que no existen en la base: la consulta fallaba con 500
 * y la pantalla se quedaba vacía.
 */
const CAMPO_FECHA = 'Fecha entrada';
const CAMPO_MENSAJE = 'Resumen';

/** Opciones reales del select "Prioridad". */
const PRIORIDAD_URGENTE = 'Alta';
const PRIORIDAD_NORMAL = 'Normal';

export async function GET(req: NextRequest) {
  const clienteId = req.nextUrl.searchParams.get('clienteId');
  if (!clienteId) {
    return NextResponse.json({ error: 'clienteId requerido' }, { status: 400 });
  }

  const response = await notion.databases.query({
    database_id: CONSULTAS_DB,
    filter: { property: 'Cliente', relation: { contains: clienteId } },
    sorts: [{ property: CAMPO_FECHA, direction: 'descending' }],
  });

  const consultas = response.results.map((page) => {
    const p = page as unknown as {
      id: string;
      properties: Record<string, never>;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props = p.properties as any;

    const tituloCompleto: string = props['Nombre']?.title?.[0]?.plain_text ?? '';
    // Quitar el prefijo "NombreCliente - " para quedarnos con el asunto.
    const asunto = tituloCompleto.includes(' - ')
      ? tituloCompleto.substring(tituloCompleto.indexOf(' - ') + 3)
      : tituloCompleto;

    return {
      id: p.id,
      asunto,
      mensaje: props[CAMPO_MENSAJE]?.rich_text?.[0]?.plain_text ?? '',
      estado: props['Estado']?.select?.name ?? 'Nueva',
      fecha: props[CAMPO_FECHA]?.date?.start ?? null,
      respuesta: props['Respuesta']?.rich_text?.[0]?.plain_text ?? null,
      urgente: props['Prioridad']?.select?.name === PRIORIDAD_URGENTE,
    };
  });

  return NextResponse.json(consultas);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    asunto: string;
    mensaje: string;
    clienteId: string;
    clienteNombre: string;
    clienteEmail: string;
    urgente?: boolean;
  };

  const { asunto, mensaje, clienteId, clienteNombre, clienteEmail, urgente } = body;
  if (!asunto || !mensaje || !clienteId) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
  }

  await notion.pages.create({
    parent: { database_id: CONSULTAS_DB },
    properties: {
      Nombre: {
        title: [{ text: { content: `${clienteNombre} - ${asunto}` } }],
      },
      Cliente: { relation: [{ id: clienteId }] },
      [CAMPO_MENSAJE]: { rich_text: [{ text: { content: mensaje } }] },
      Estado: { select: { name: 'Nueva' } },
      Prioridad: {
        select: { name: urgente ? PRIORIDAD_URGENTE : PRIORIDAD_NORMAL },
      },
      ...(clienteEmail ? { 'Email de': { email: clienteEmail } } : {}),
      [CAMPO_FECHA]: {
        date: { start: new Date().toISOString().split('T')[0] },
      },
    },
  });

  return NextResponse.json({ success: true });
}
