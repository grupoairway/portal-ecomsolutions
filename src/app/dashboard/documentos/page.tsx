import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeSession } from '@/lib/session';
import { getDocumentosCliente } from '@/lib/notion';
import DocumentosGrid from '@/components/DocumentosGrid';
import styles from './documentos.module.css';

export default async function DocumentosPage() {
  const sessionCookie = cookies().get('portal_session');
  if (!sessionCookie) redirect('/');
  const session = decodeSession(sessionCookie.value);
  if (!session) redirect('/');

  const documentos = await getDocumentosCliente(session.clienteId).catch(() => []);

  return (
    <div className={styles.content}>
      <div className={styles.pageHeader}>
        <h1 className={styles.h1}>Mis documentos</h1>
        <p className={styles.subtitulo}>Documentos y archivos de tu gestoría</p>
      </div>
      <DocumentosGrid documentos={documentos} />
    </div>
  );
}
