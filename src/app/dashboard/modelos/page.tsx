import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeSession } from '@/lib/session';
import { getModelosCliente } from '@/lib/notion';
import ModelosClient from './ModelosClient';
import styles from '../dashboard.module.css';

export default async function ModelosPage() {
  const sessionCookie = cookies().get('portal_session');
  if (!sessionCookie) redirect('/');
  const session = decodeSession(sessionCookie.value);
  if (!session) redirect('/');

  const modelos = await getModelosCliente(session.clienteId).catch(() => []);

  const pendientes = modelos.filter(
    m => m.estado === 'Listo para presentar' || m.estado === 'Confirmado',
  );
  const historial = modelos.filter(
    m => m.estado === 'Presentado' || m.estado === 'Domiciliado',
  );

  return (
    <div className={styles.pageContent}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.3px' }}>
          Modelos fiscales
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-muted)', marginTop: 4 }}>
          Revisa y confirma tus declaraciones
        </p>
      </div>
      <ModelosClient pendientes={pendientes} historial={historial} />
    </div>
  );
}
