import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeSession } from '@/lib/session';
import { getUltimoInforme } from '@/lib/notion';
import TablaContable from '@/components/TablaContable';
import { parseExcelFilas } from '@/lib/balance-tipos';
import type { FilaBalance } from '@/lib/balance-tipos';
import styles from './pyg.module.css';

export default async function PyGPage() {
  const sessionCookie = cookies().get('portal_session');
  if (!sessionCookie) redirect('/');
  const session = decodeSession(sessionCookie.value);
  if (!session) redirect('/');

  const informe = await getUltimoInforme(session.clienteId).catch(() => null);

  let filas: FilaBalance[] = [];
  let periodo = '';

  if (informe?.pygJSON) {
    try {
      const data = JSON.parse(informe.pygJSON);
      // Soporta tanto { pyg: [...] } como array directo
      const rows = Array.isArray(data) ? data : (data.pyg || []);
      filas = parseExcelFilas(rows, 'pyg');
      // Para PyG, los epígrafes A), B), C), D) son totales
      filas = filas.map(f => ({
        ...f,
        esTotal: f.esTotal || /^[A-Z]\)\s*$/.test(f.codigo),
      }));
      periodo = informe.periodo;
    } catch {
      // JSON inválido
    }
  }

  const titulo = periodo ? `Pérdidas y Ganancias · ${periodo}` : 'Cuenta de Pérdidas y Ganancias';

  return (
    <div className={styles.content}>
      <div className={styles.topBar}>
        <h1 className={styles.h1}>{titulo}</h1>
      </div>

      {filas.length === 0 ? (
        <div className={styles.uploadArea}>
          <p className={styles.uploadTitle}>Sin datos disponibles</p>
          <p className={styles.uploadDesc}>
            Tu gestor publicará la cuenta de PyG próximamente.
          </p>
        </div>
      ) : (
        <TablaContable filas={filas} titulo="Detalle PyG" />
      )}
    </div>
  );
}
