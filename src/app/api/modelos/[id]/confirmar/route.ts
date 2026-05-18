import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import { cookies } from 'next/headers';
import { decodeSession } from '@/lib/session';
import { sendConfirmacionGestor } from '@/lib/mailer';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const FORMA_PAGO: Record<string, string> = {
  presentar: 'Voluntario',
  domiciliar: 'Domiciliación',
  aplazar: 'Aplazamiento',
  devolucion_cuenta: 'Devolución en cuenta',
  compensar: 'Compensar próximas presentaciones',
};

const ACCION_LABEL: Record<string, string> = {
  presentar: 'Confirmar presentación (pago voluntario)',
  domiciliar: 'Domiciliar pago',
  aplazar: 'Solicitar aplazamiento',
  devolucion_cuenta: 'Confirmar y solicitar devolución en cuenta',
  compensar: 'Compensar en próximas declaraciones',
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  console.log('=== CONFIRMAR MODELO ===')
  console.log('SMTP_PASSWORD exists:', !!process.env.SMTP_PASSWORD)
  console.log('Notion page id:', params.id)

  const sessionCookie = cookies().get('portal_session');
  if (!sessionCookie) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const session = decodeSession(sessionCookie.value);
  if (!session) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

  const body = await req.json() as { accion: string; iban?: string; motivo?: string };
  const { accion, iban, motivo } = body;
  console.log('Acción recibida:', accion)

  const formaPago = FORMA_PAGO[accion];
  if (!formaPago) return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const page = await notion.pages.retrieve({ page_id: params.id }) as any;
  const titulo: string = page.properties['Título']?.title?.[0]?.plain_text ?? 'Modelo';
  console.log('Título del modelo:', titulo)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateProps: Record<string, any> = {
    'Confirmación cliente': { select: { name: 'Confirmado' } },
    'Forma pago/cobro': { select: { name: formaPago } },
    Estado: { select: { name: 'Confirmado' } },
  };
  if (iban) updateProps['IBAN'] = { rich_text: [{ text: { content: iban } }] };
  if (motivo) updateProps['Notas cliente'] = { rich_text: [{ text: { content: motivo } }] };

  await notion.pages.update({ page_id: params.id, properties: updateProps });
  console.log('Notion actualizado correctamente')

  console.log('Enviando email a: info@ecomsolutions.es')
  try {
    await sendConfirmacionGestor({
      clienteNombre: session.nombre,
      titulo,
      accion,
      accionLabel: ACCION_LABEL[accion] ?? accion,
      iban,
      motivo,
    });
  } catch (emailError) {
    console.error('ERROR enviando email:', emailError)
    if (emailError instanceof Error) {
      console.error('  message:', emailError.message)
      console.error('  stack:', emailError.stack)
    }
    // No fallamos el request — la confirmación en Notion ya está guardada
  }

  return NextResponse.json({ success: true });
}
