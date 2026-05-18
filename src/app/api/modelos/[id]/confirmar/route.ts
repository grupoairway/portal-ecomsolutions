import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import { cookies } from 'next/headers';
import { decodeSession } from '@/lib/session';
import nodemailer from 'nodemailer';

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
  const sessionCookie = cookies().get('portal_session');
  if (!sessionCookie) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const session = decodeSession(sessionCookie.value);
  if (!session) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

  const body = await req.json() as { accion: string; iban?: string; motivo?: string };
  const { accion, iban, motivo } = body;

  const formaPago = FORMA_PAGO[accion];
  if (!formaPago) return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const page = await notion.pages.retrieve({ page_id: params.id }) as any;
  const titulo: string = page.properties['Título']?.title?.[0]?.plain_text ?? 'Modelo';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateProps: Record<string, any> = {
    'Confirmación cliente': { select: { name: 'Confirmado' } },
    'Forma pago/cobro': { select: { name: formaPago } },
    Estado: { select: { name: 'Confirmado' } },
  };
  if (iban) updateProps['IBAN'] = { rich_text: [{ text: { content: iban } }] };
  if (motivo) updateProps['Notas cliente'] = { rich_text: [{ text: { content: motivo } }] };

  await notion.pages.update({ page_id: params.id, properties: updateProps });

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true,
      auth: { user: 'noreply@ecomsolutions.es', pass: process.env.SMTP_PASSWORD },
    });
    await transporter.sendMail({
      from: 'EcomSolutions <noreply@ecomsolutions.es>',
      to: 'info@ecomsolutions.es',
      subject: `✅ ${session.nombre} ha confirmado ${titulo}`,
      html: `
        <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;">
          <h2 style="color:#0f172a;margin-bottom:20px;">✅ Confirmación de modelo fiscal</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:120px;">Cliente</td><td style="padding:8px 0;font-weight:600;">${session.nombre}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Modelo</td><td style="padding:8px 0;font-weight:600;">${titulo}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Acción</td><td style="padding:8px 0;font-weight:600;">${ACCION_LABEL[accion] ?? accion}</td></tr>
            ${iban ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">IBAN</td><td style="padding:8px 0;font-weight:600;">${iban}</td></tr>` : ''}
            ${motivo ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Motivo</td><td style="padding:8px 0;font-weight:600;">${motivo}</td></tr>` : ''}
          </table>
        </div>
      `,
    });
  } catch (e) {
    console.error('Error enviando email de confirmación:', e);
  }

  return NextResponse.json({ success: true });
}
