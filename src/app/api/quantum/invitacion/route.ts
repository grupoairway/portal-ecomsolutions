import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session-server';
import { sendInvitacionQuantum } from '@/lib/mailer';
import { permitirUnaVezAlDia } from '@/lib/limite-diario';

/**
 * El cliente pide que le reenvíen su invitación a Quantum. El portal no habla
 * con Quantum: manda un aviso al gestor y le dice al cliente que la tendrá en
 * 24 horas. Una petición al día por cliente.
 */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const limite = permitirUnaVezAlDia(`invitacion-quantum:${session.clienteId}`);
  if (!limite.permitido) {
    return NextResponse.json(
      {
        error:
          'Ya nos lo has pedido hoy. Te reenviaremos la invitación en 24 horas.',
      },
      { status: 429 },
    );
  }

  try {
    await sendInvitacionQuantum({
      clienteNombre: session.nombre,
      clienteEmail: session.email,
    });
  } catch (error) {
    console.error('No se pudo avisar al gestor de la invitación:', error);
    return NextResponse.json(
      { error: 'No hemos podido enviar tu petición. Vuelve a intentarlo.' },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    mensaje: 'Te la reenviaremos en 24 horas',
  });
}
