import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const CONSULTAS_DB = '35f774ba27998070bf3bf1c9858f412c';

export async function GET(req: NextRequest) {
  const clienteId = req.nextUrl.searchParams.get('clienteId');
  if (!clienteId) {
    return NextResponse.json({ error: 'clienteId requerido' }, { status: 400 });
  }

  const response = await notion.databases.query({
    database_id: CONSULTAS_DB,
    filter: { property: 'Cliente', relation: { contains: clienteId } },
    sorts: [{ property: 'Fecha', direction: 'descending' }],
  });

  const consultas = response.results.map((page) => {
    const p = page as unknown as {
      id: string;
      properties: {
        Nombre: { title: Array<{ plain_text: string }> };
        Mensaje: { rich_text: Array<{ plain_text: string }> };
        Estado: { select: { name: string } | null };
        Fecha: { date: { start: string } | null };
        Respuesta: { rich_text: Array<{ plain_text: string }> };
      };
    };

    const tituloCompleto = p.properties.Nombre.title[0]?.plain_text ?? '';
    // Remove the "ClienteNombre - " prefix to get just the asunto
    const asunto = tituloCompleto.includes(' - ')
      ? tituloCompleto.substring(tituloCompleto.indexOf(' - ') + 3)
      : tituloCompleto;

    return {
      id: p.id,
      asunto,
      mensaje: p.properties.Mensaje.rich_text[0]?.plain_text ?? '',
      estado: p.properties.Estado.select?.name ?? 'Nueva',
      fecha: p.properties.Fecha.date?.start ?? null,
      respuesta: p.properties.Respuesta?.rich_text[0]?.plain_text ?? null,
    };
  });

  return NextResponse.json(consultas);
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    asunto: string;
    mensaje: string;
    clienteId: string;
    clienteNombre: string;
    clienteEmail: string;
  };

  const { asunto, mensaje, clienteId, clienteNombre } = body;
  if (!asunto || !mensaje || !clienteId) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
  }

  await notion.pages.create({
    parent: { database_id: CONSULTAS_DB },
    properties: {
      Nombre: {
        title: [{ text: { content: `${clienteNombre} - ${asunto}` } }],
      },
      Cliente: {
        relation: [{ id: clienteId }],
      },
      Mensaje: {
        rich_text: [{ text: { content: mensaje } }],
      },
      Estado: {
        select: { name: 'Nueva' },
      },
      Origen: {
        select: { name: 'Portal cliente' },
      },
      Fecha: {
        date: { start: new Date().toISOString().split('T')[0] },
      },
    },
  });

  return NextResponse.json({ success: true });
}
