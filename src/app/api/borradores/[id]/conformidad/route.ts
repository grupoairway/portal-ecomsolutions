import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import { getSession } from '@/lib/session-server';
import { getVencimiento } from '@/lib/vencimientos';
import { sendConfirmacionGestor } from '@/lib/mailer';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

/**
 * Opciones reales del select "Forma pago/cobro" en Notion. Si se manda
 * cualquier otra cosa, Notion la crearía como opción nueva y ensuciaría la
 * base, así que se rechaza.
 */
const FORMAS_PAGO = [
  'NRC',
  'Domiciliación',
  'Aplazamiento',
  'Devolución en cuenta',
  'Compensar próximas',
] as const;

type FormaPago = (typeof FORMAS_PAGO)[number];

/** Las que necesitan cuenta bancaria. */
const REQUIEREN_IBAN: FormaPago[] = ['Domiciliación', 'Devolución en cuenta'];

interface Cuerpo {
  formaPago?: string;
  iban?: string;
  comentario?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { formaPago, iban, comentario } = (await req.json()) as Cuerpo;

  // El vencimiento tiene que ser de este cliente: getVencimiento devuelve null
  // si la relación "Cliente" no coincide con la sesión.
  const vencimiento = await getVencimiento(params.id, session.clienteId).catch(
    () => null,
  );
  if (!vencimiento) {
    return NextResponse.json(
      { error: 'No hemos encontrado ese borrador' },
      { status: 404 },
    );
  }

  if (vencimiento.presentado) {
    return NextResponse.json(
      { error: 'Este modelo ya está presentado' },
      { status: 409 },
    );
  }

  // La conformidad es prueba ante el cliente: no se sobrescribe una ya dada.
  if (vencimiento.conformidadFecha) {
    return NextResponse.json(
      { error: 'Ya habías dado tu conformidad a este borrador' },
      { status: 409 },
    );
  }

  if (formaPago && !FORMAS_PAGO.includes(formaPago as FormaPago)) {
    return NextResponse.json(
      { error: 'Forma de pago no válida' },
      { status: 400 },
    );
  }

  const ibanLimpio = iban?.replace(/\s+/g, '').toUpperCase() || undefined;

  // El IBAN solo se pide si hace falta y no hay uno ya guardado.
  if (
    formaPago &&
    REQUIEREN_IBAN.includes(formaPago as FormaPago) &&
    !ibanLimpio &&
    !vencimiento.iban
  ) {
    return NextResponse.json(
      { error: 'Necesitamos el IBAN para esa forma de pago' },
      { status: 400 },
    );
  }

  if (ibanLimpio && !/^ES\d{22}$/.test(ibanLimpio)) {
    return NextResponse.json(
      { error: 'El IBAN no tiene el formato correcto: ES y 22 dígitos' },
      { status: 400 },
    );
  }

  // Fecha CON HORA: la conformidad es prueba ante el cliente.
  const ahora = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const propiedades: Record<string, any> = {
    'Conformidad fecha': { date: { start: ahora } },
    'Conformidad por': {
      rich_text: [{ text: { content: `${session.nombre} <${session.email}>` } }],
    },
    'Confirmación cliente': { select: { name: 'Confirmado' } },
    Estado: { select: { name: 'Confirmado' } },
  };

  if (formaPago) {
    propiedades['Forma pago/cobro'] = { select: { name: formaPago } };
  }
  if (ibanLimpio) {
    propiedades['IBAN'] = { rich_text: [{ text: { content: ibanLimpio } }] };
  }
  if (comentario?.trim()) {
    propiedades['Notas cliente'] = {
      rich_text: [{ text: { content: comentario.trim().slice(0, 2000) } }],
    };
  }

  try {
    await notion.pages.update({ page_id: params.id, properties: propiedades });
  } catch (error) {
    console.error('Error al guardar la conformidad en Notion:', error);
    return NextResponse.json(
      { error: 'No hemos podido guardar tu conformidad. Vuelve a intentarlo.' },
      { status: 502 },
    );
  }

  // El aviso al gestor no debe tumbar la conformidad, que ya está guardada.
  try {
    await sendConfirmacionGestor({
      clienteNombre: session.nombre,
      clienteEmail: session.email,
      modeloNombre: `Modelo ${vencimiento.modelo} · ${vencimiento.modeloDescripcion}`,
      periodo: vencimiento.periodo,
      accionLabel: formaPago
        ? `Conformidad dada · ${formaPago}`
        : 'Conformidad dada',
      iban: ibanLimpio,
      motivo: comentario?.trim() || undefined,
    });
  } catch (error) {
    console.error('Conformidad guardada, pero el aviso al gestor falló:', error);
  }

  return NextResponse.json({ ok: true, conformidadFecha: ahora });
}
