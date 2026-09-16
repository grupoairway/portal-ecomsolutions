import { requireSession } from '@/lib/session-server';
import { buscarClientePorEmail } from '@/lib/notion';
import ConsultasClient from './ConsultasClient';

export default async function ConsultasPage() {
  const session = await requireSession();

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
