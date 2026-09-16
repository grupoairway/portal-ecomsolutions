import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import { getSession } from '@/lib/session-server';
import {
  formaPagoAutomatica,
  formasPagoPermitidas,
  getVencimiento,
  REQUIEREN_IBAN,
} from '@/lib/vencimientos';
import { sendConfirmacionGestor } from '@/lib/mailer';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

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

  /*
   * Las formas admisibles dependen del modelo y del periodo: un 303 negativo
   * de un trimestre que no sea el cuarto solo se puede compensar, y una Renta
   * a devolver solo se cobra en cuenta. La regla vive en vencimientos-tipos,
   * la misma que pinta los radios en la pantalla, para que no puedan
   * separarse.
   */
  const permitidas = formasPagoPermitidas(vencimiento);

  if (formaPago && !permitidas.includes(formaPago)) {
    return NextResponse.json(
      {
        error:
          permitidas.length === 0
            ? 'Este modelo no admite elegir forma de pago o cobro'
            : `Ese cobro no es posible en el modelo ${vencimiento.modelo} de ${vencimiento.periodo}`,
      },
      { status: 400 },
    );
  }

  // Cuando la ley solo deja un camino no se pregunta: se anota. Es el caso
  // del IVA negativo fuera del 4T, que se arrastra a la siguiente.
  const formaFinal = formaPago || formaPagoAutomatica(vencimiento) || undefined;

  const ibanLimpio = iban?.replace(/\s+/g, '').toUpperCase() || undefined;

  // El IBAN solo se pide si hace falta y no hay uno ya guardado.
  if (
    formaFinal &&
    REQUIEREN_IBAN.includes(formaFinal) &&
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

  if (formaFinal) {
    propiedades['Forma pago/cobro'] = { select: { name: formaFinal } };
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
      accionLabel: formaFinal
        ? `Conformidad dada · ${formaFinal}`
        : 'Conformidad dada',
      iban: ibanLimpio,
      motivo: comentario?.trim() || undefined,
    });
  } catch (error) {
    console.error('Conformidad guardada, pero el aviso al gestor falló:', error);
  }

  return NextResponse.json({ ok: true, conformidadFecha: ahora });
}
