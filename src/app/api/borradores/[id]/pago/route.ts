import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import { getSession } from '@/lib/session-server';
import { getVencimiento } from '@/lib/vencimientos';
import { limpiarNrc, PATRON_NRC } from '@/lib/vencimientos-tipos';
import { sendPagoGestor } from '@/lib/mailer';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

/**
 * El cliente ha pagado el modelo con la carta de pago y nos trae el NRC que
 * le ha dado su banco. Solo tiene sentido cuando paga él: si tiene
 * certificado digital, pagamos nosotros y no hay nada que introducir.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { nrc } = (await req.json()) as { nrc?: string };

  const vencimiento = await getVencimiento(params.id, session.clienteId).catch(
    () => null,
  );
  if (!vencimiento) {
    return NextResponse.json(
      { error: 'No hemos encontrado ese modelo' },
      { status: 404 },
    );
  }

  if (!vencimiento.pagaElCliente) {
    return NextResponse.json(
      { error: 'De este pago nos encargamos nosotros' },
      { status: 409 },
    );
  }

  if (!vencimiento.conformidadFecha) {
    return NextResponse.json(
      { error: 'Antes de pagar necesitamos tu conformidad al borrador' },
      { status: 409 },
    );
  }

  // El pago es prueba ante el cliente: no se sobrescribe uno ya registrado.
  if (vencimiento.fechaPago) {
    return NextResponse.json(
      { error: 'Ya nos habías dado el NRC de este modelo' },
      { status: 409 },
    );
  }

  const nrcLimpio = limpiarNrc(nrc ?? '');
  if (!PATRON_NRC.test(nrcLimpio)) {
    return NextResponse.json(
      { error: 'El NRC son 22 caracteres entre letras y números' },
      { status: 400 },
    );
  }

  // Fecha CON HORA, igual que la conformidad.
  const ahora = new Date().toISOString();

  try {
    await notion.pages.update({
      page_id: params.id,
      properties: {
        NRC: { rich_text: [{ text: { content: nrcLimpio } }] },
        'Fecha pago': { date: { start: ahora } },
      },
    });
  } catch (error) {
    console.error('Error al guardar el NRC en Notion:', error);
    return NextResponse.json(
      { error: 'No hemos podido guardar el NRC. Vuelve a intentarlo.' },
      { status: 502 },
    );
  }

  // El aviso al gestor no debe tumbar el pago, que ya está guardado.
  try {
    await sendPagoGestor({
      clienteNombre: session.nombre,
      clienteEmail: session.email,
      modeloNombre: `Modelo ${vencimiento.modelo} · ${vencimiento.modeloDescripcion}`,
      periodo: vencimiento.periodo,
      nrc: nrcLimpio,
      importe: vencimiento.importe,
    });
  } catch (error) {
    console.error('NRC guardado, pero el aviso al gestor falló:', error);
  }

  return NextResponse.json({ ok: true, nrc: nrcLimpio, fechaPago: ahora });
}
