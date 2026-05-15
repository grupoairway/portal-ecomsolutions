import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeSession } from '@/lib/session';
import { getUltimoInforme } from '@/lib/notion';
import TablaContable from '@/components/TablaContable';
import { parseExcelFilas } from '@/lib/balance-tipos';
import type { FilaBalance } from '@/lib/balance-tipos';
import styles from './balance.module.css';

export default async function BalancePage() {
  const sessionCookie = cookies().get('portal_session');
  if (!sessionCookie) redirect('/');
  const session = decodeSession(sessionCookie.value);
  if (!session) redirect('/');

  const informe = await getUltimoInforme(session.clienteId).catch(() => null);

  let activo: FilaBalance[] = [];
  let pasivo: FilaBalance[] = [];
  let periodo = '';

  if (informe?.balanceJSON) {
    try {
      const data = JSON.parse(informe.balanceJSON);
      activo = parseExcelFilas(data.activo || [], 'activo');
      pasivo = parseExcelFilas(data.pasivo || [], 'pasivo');
      periodo = informe.periodo;
    } catch {
      // JSON inválido
    }
  }

  const titulo = periodo ? `Balance · ${periodo}` : 'Balance de situación';
  const sinDatos = activo.length === 0 && pasivo.length === 0;

  return (
    <div className={styles.content}>
      <div className={styles.topBar}>
        <h1 className={styles.h1}>{titulo}</h1>
      </div>

      {sinDatos ? (
        <div className={styles.uploadArea}>
          <p className={styles.uploadTitle}>Sin datos disponibles</p>
          <p className={styles.uploadDesc}>
            Tu gestor publicará el balance próximamente.
          </p>
        </div>
      ) : (
        <>
          {activo.length > 0 && (
            <div className={styles.seccion}>
              <h2 className={styles.seccionTitle}>Activo</h2>
              <TablaContable filas={activo} />
            </div>
          )}
          {pasivo.length > 0 && (
            <div className={styles.seccion}>
              <h2 className={styles.seccionTitle}>Pasivo y Patrimonio Neto</h2>
              <TablaContable filas={pasivo} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
