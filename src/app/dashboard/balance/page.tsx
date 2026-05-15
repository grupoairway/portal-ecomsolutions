import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeSession } from '@/lib/session';
import { getUltimoInforme } from '@/lib/notion';
import TablaContable from '@/components/TablaContable';
import type { FilaContable } from '@/lib/excel-parser';
import styles from './balance.module.css';

function parseFilas(raw: unknown): FilaContable[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((f) => ({
    codigo: String(f?.codigo ?? ''),
    descripcion: String(f?.descripcion ?? ''),
    valorActual: typeof f?.valorActual === 'number' ? f.valorActual : parseFloat(f?.valorActual) || 0,
    valorAnterior: typeof f?.valorAnterior === 'number' ? f.valorAnterior : parseFloat(f?.valorAnterior) || 0,
    variacion: typeof f?.variacion === 'number' ? f.variacion : (f?.variacion != null ? parseFloat(f.variacion) : null),
    tipo: f?.tipo ?? 'cuenta',
    nivel: typeof f?.nivel === 'number' ? f.nivel : 1,
  }));
}

export default async function BalancePage() {
  const sessionCookie = cookies().get('portal_session');
  if (!sessionCookie) redirect('/');
  const session = decodeSession(sessionCookie.value);
  if (!session) redirect('/');

  const informe = await getUltimoInforme(session.clienteId).catch(() => null);

  let activo: FilaContable[] = [];
  let pasivo: FilaContable[] = [];
  let periodo = '';

  if (informe?.balanceJSON) {
    try {
      const parsed = JSON.parse(informe.balanceJSON);
      activo = parseFilas(parsed?.activo);
      pasivo = parseFilas(parsed?.pasivo);
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
