import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeSession } from '@/lib/session';
import { getDocumentosCliente, getVencimientosPendientesCliente } from '@/lib/notion';
import DocumentosTabs from '@/components/DocumentosTabs';
import styles from './documentos.module.css';

export default async function DocumentosPage() {
  const sessionCookie = cookies().get('portal_session');
  if (!sessionCookie) redirect('/');
  const session = decodeSession(sessionCookie.value);
  if (!session) redirect('/');

  const [documentos, vencimientos] = await Promise.all([
    getDocumentosCliente(session.clienteId).catch(() => []),
    getVencimientosPendientesCliente(session.clienteId).catch(() => []),
  ]);

  return (
    <div className={styles.content}>
      <div className={styles.pageHeader}>
        <h1 className={styles.h1}>Documentación</h1>
        <p className={styles.subtitulo}>Consulta tus documentos y envía archivos a tu gestoría</p>
      </div>
      <DocumentosTabs documentos={documentos} vencimientos={vencimientos} />
    </div>
  );
}
