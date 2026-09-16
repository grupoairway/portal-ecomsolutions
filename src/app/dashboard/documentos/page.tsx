import { requireSession } from '@/lib/session-server';
import { getDocumentosCliente } from '@/lib/notion';
import DocumentosTabs from '@/components/DocumentosTabs';
import styles from './documentos.module.css';

export default async function DocumentosPage() {
  const session = await requireSession();

  const documentos = await getDocumentosCliente(session.clienteId).catch(() => []);

  return (
    <div className={styles.content}>
      <div className={styles.pageHeader}>
        <h1 className={styles.h1}>Documentación</h1>
        <p className={styles.subtitulo}>Consulta tus documentos y envía archivos a tu gestoría</p>
      </div>
      <DocumentosTabs documentos={documentos} />
    </div>
  );
}
