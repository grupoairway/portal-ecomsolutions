import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeSession } from '@/lib/session';
import { buscarClientePorEmail } from '@/lib/notion';
import ConsultasClient from './ConsultasClient';

export default async function ConsultasPage() {
  const sessionCookie = cookies().get('portal_session');
  if (!sessionCookie) redirect('/');
  const session = decodeSession(sessionCookie.value);
  if (!session) redirect('/');

  let nombreCliente = session.nombre;
  if (!nombreCliente || nombreCliente === 'Cliente') {
    const clienteNotion = await buscarClientePorEmail(session.email).catch(() => null);
    if (clienteNotion?.nombre) nombreCliente = clienteNotion.nombre;
  }

  const res = await fetch(
    `${process.env.BASE_URL ?? 'http://localhost:3000'}/api/consultas?clienteId=${session.clienteId}`,
    { cache: 'no-store' },
  ).catch(() => null);

  const consultas = res?.ok ? await res.json() : [];

  return (
    <ConsultasClient
      clienteId={session.clienteId}
      clienteNombre={nombreCliente}
      clienteEmail={session.email}
      consultas={consultas}
    />
  );
}
