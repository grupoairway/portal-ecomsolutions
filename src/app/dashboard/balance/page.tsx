import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { getUltimoInforme } from '@/lib/notion';
import TablaContable from '@/components/TablaContable';
import type { FilaContable } from '@/lib/excel-parser';
import styles from './balance.module.css';

export default async function BalancePage() {
  const token = cookies().get('portal_session')?.value;
  if (!token) redirect('/');
  const session = await verifyToken(token);
  if (!session) redirect('/');

  const informe = await getUltimoInforme(session.clienteId).catch(() => null);

  let activo: FilaContable[] = [];
  let pasivo: FilaContable[] = [];
  let periodo = '';

  if (informe?.balanceJSON) {
    try {
      const parsed = JSON.parse(informe.balanceJSON) as {
        activo: FilaContable[];
        pasivo: FilaContable[];
      };
      activo = parsed.activo ?? [];
      pasivo = parsed.pasivo ?? [];
      periodo = informe.periodo;
    } catch {
      // JSON inválido, se muestra estado vacío
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
