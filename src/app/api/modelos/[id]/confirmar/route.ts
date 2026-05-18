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
  const props = page.properties;

  const titulo: string = props['Título']?.title?.[0]?.plain_text ?? 'Modelo';
  // Extract modelo number and periodo for the email subject
  const modeloNum = titulo.match(/\b(\d{3})\b/)?.[1];
  const modeloNombre = props['Modelo']?.select?.name ?? props['Modelo']?.rich_text?.[0]?.plain_text ?? (modeloNum ? `Modelo ${modeloNum}` : titulo);
  const periodoFromTitle = titulo.match(/(\dT\s*\d{4}|\bAnual\s+\d{4})/i)?.[1]?.trim() ?? '';
  const periodo = props['Período']?.select?.name ?? props['Período']?.rich_text?.[0]?.plain_text ?? props['Periodo']?.select?.name ?? periodoFromTitle;

  console.log('Título:', titulo, '| Modelo:', modeloNombre, '| Período:', periodo)

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
      modeloNombre,
      periodo,
      accionLabel: ACCION_LABEL[accion] ?? accion,
      iban,
      motivo,
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (emailError: any) {
    console.error('ERROR email:', emailError.message)
    // Temporal: incluir error en respuesta para diagnóstico
    return NextResponse.json({
      success: true,
      notionActualizado: true,
      emailError: emailError.message,
      emailStack: emailError.stack?.substring(0, 200),
    });
  }

  return NextResponse.json({ success: true });
}
