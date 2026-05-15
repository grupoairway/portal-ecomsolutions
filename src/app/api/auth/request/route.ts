import { NextRequest, NextResponse } from 'next/server';
import { buscarClientePorEmail } from '@/lib/notion';
import { generateMagicLinkToken } from '@/lib/auth';
import { enviarMagicLink } from '@/lib/resend';

export async function POST(request: NextRequest) {
  console.log('RESEND_KEY exists:', !!process.env.RESEND_API_KEY);
  console.log('BASE_URL:', process.env.BASE_URL);

  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('[auth/request] Buscando cliente con email:', normalizedEmail);

    let cliente;
    try {
      cliente = await buscarClientePorEmail(normalizedEmail);
    } catch (notionError) {
      console.error('[auth/request] Error al consultar Notion:', notionError);
      return NextResponse.json(
        { error: 'Error al consultar Notion', detail: String(notionError) },
        { status: 500 },
      );
    }

    if (!cliente) {
      console.log('[auth/request] Cliente NO encontrado para:', normalizedEmail);
      // No revelar si el email existe o no por seguridad
      return NextResponse.json({ success: true });
    }

    console.log('[auth/request] Cliente encontrado:', { id: cliente.id, nombre: cliente.nombre });

    const token = await generateMagicLinkToken({
      email: cliente.email,
      clienteId: cliente.id,
      nombre: cliente.nombre,
    });

    console.log('[auth/request] Token generado, enviando email a:', cliente.email);

    const { data, error: resendError } = await enviarMagicLink({
      email: cliente.email,
      nombre: cliente.nombre,
      token,
    });

    if (resendError) {
      console.error('[auth/request] Error de Resend:', JSON.stringify(resendError, null, 2));
      return NextResponse.json(
        { error: 'Error al enviar email', resendError },
        { status: 500 },
      );
    }

    console.log('[auth/request] Email enviado correctamente. Resend ID:', (data as { id?: string })?.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[auth/request] Error inesperado:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', detail: String(error) },
      { status: 500 },
    );
  }
}
