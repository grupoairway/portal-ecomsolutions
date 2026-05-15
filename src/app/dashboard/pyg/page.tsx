import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeSession } from '@/lib/session';
import { getUltimoInforme } from '@/lib/notion';
import TablaContable from '@/components/TablaContable';
import type { FilaContable } from '@/lib/excel-parser';
import styles from './pyg.module.css';

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

export default async function PyGPage() {
  const sessionCookie = cookies().get('portal_session');
  if (!sessionCookie) redirect('/');
  const session = decodeSession(sessionCookie.value);
  if (!session) redirect('/');

  const informe = await getUltimoInforme(session.clienteId).catch(() => null);

  let filas: FilaContable[] = [];
  let periodo = '';

  if (informe?.pygJSON) {
    try {
      const parsed = JSON.parse(informe.pygJSON);
      filas = parseFilas(parsed);
      periodo = informe.periodo;
    } catch {
      // JSON inválido, se muestra estado vacío
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
