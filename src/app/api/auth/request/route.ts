import { NextRequest, NextResponse } from 'next/server';
import { buscarClientePorEmail } from '@/lib/notion';
import { generateMagicLinkToken } from '@/lib/auth';
import { enviarMagicLink } from '@/lib/resend';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cliente = await buscarClientePorEmail(normalizedEmail);

    if (!cliente) {
      // No revelar si el email existe o no por seguridad
      return NextResponse.json({ success: true });
    }

    const token = await generateMagicLinkToken({
      email: cliente.email,
      clienteId: cliente.id,
      nombre: cliente.nombre,
    });

    await enviarMagicLink({
      email: cliente.email,
      nombre: cliente.nombre,
      token,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en /api/auth/request:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
