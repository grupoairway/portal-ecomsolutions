import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getDocumentosCliente } from '@/lib/notion';
import DocumentosGrid from '@/components/DocumentosGrid';
import styles from './documentos.module.css';

export default async function DocumentosPage() {
  const token = cookies().get('portal_session')!.value;
  const session = (await verifyToken(token))!;

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
