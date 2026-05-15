import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { verifyToken } from '@/lib/auth';
import { obtenerVencimientosCliente, getDocumentosCliente } from '@/lib/notion';
import type { DocumentoNotion } from '@/lib/notion';
import MetricCard from '@/components/MetricCard';
import VencimientosList from '@/components/VencimientosList';
import GraficoBarras from '@/components/GraficoBarras';
import GraficoLineas from '@/components/GraficoLineas';
import styles from './dashboard.module.css';

const TIPO_ICONOS: Record<string, string> = {
  'Modelos presentados': '📄',
  'Escrituras y contratos': '📋',
  'Nóminas': '💰',
  'Notificaciones': '🔔',
  'Otros': '📁',
};

function formatearFechaCorta(fecha: string | null): string {
  if (!fecha) return '';
  return new Date(fecha).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function DashboardPage() {
  const token = cookies().get('portal_session')?.value;
  if (!token) redirect('/');
  const session = await verifyToken(token);
  if (!session) redirect('/');

  const [vencimientos, documentos] = await Promise.all([
    obtenerVencimientosCliente(session.clienteId).catch(() => []),
    getDocumentosCliente(session.clienteId).catch(() => []),
  ]);

  const documentosRecientes = documentos.slice(0, 3) as DocumentoNotion[];
  const datosGraficoBarra: { periodo: string; ingresos: number; gastos: number }[] = [];
  const datosGraficoLinea: { periodo: string; resultado: number }[] = [];

  return (
    <>
      {/* VENCIMIENTOS */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Vencimientos próximos</h2>
        </div>
        <div className={styles.sectionCard}>
          <VencimientosList vencimientos={vencimientos} />
        </div>
      </section>

      {/* RESUMEN FINANCIERO */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Resumen financiero</h2>
        </div>
        <div className={styles.emptyData}>
          <strong>Sin datos financieros</strong>
          Sube tu Excel de Balance o PyG desde las páginas de detalle para ver las métricas aquí.
        </div>
      </section>

      {/* GRAFICOS */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Evolución</h2>
        <div className={styles.graficosGrid}>
          <GraficoBarras datos={datosGraficoBarra} titulo="Ingresos y gastos por período" />
          <GraficoLineas datos={datosGraficoLinea} titulo="Resultado del ejercicio" />
        </div>
      </section>

      {/* DOCUMENTOS RECIENTES */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Documentos recientes</h2>
          <Link href="/dashboard/documentos" className={styles.docVerTodos}>
            Ver todos →
          </Link>
        </div>
        <div className={styles.sectionCard}>
          {documentosRecientes.length === 0 ? (
            <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>
              No hay documentos disponibles todavía.
            </p>
          ) : (
            <div className={styles.docsRecentesGrid}>
              {documentosRecientes.map((doc) => (
                <div key={doc.id} className={styles.docRecienteItem}>
                  <div className={styles.docRecienteIcono}>
                    {TIPO_ICONOS[doc.tipo] ?? '📁'}
                  </div>
                  <div className={styles.docRecienteInfo}>
                    <div className={styles.docRecienteNombre}>{doc.nombre}</div>
                    <div className={styles.docRecienteMeta}>
                      {doc.tipo}
                      {doc.fecha ? ` · ${formatearFechaCorta(doc.fecha)}` : ''}
                    </div>
                  </div>
                  {doc.urlDrive ? (
                    <a
                      href={doc.urlDrive}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.docRecienteLink}
                    >
                      Abrir →
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ACCESOS RAPIDOS */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Informes detallados</h2>
        <div className={styles.accesosGrid}>
          <Link href="/dashboard/balance" className={styles.accesoCard}>
            <div className={styles.accesoIcon}>⚖️</div>
            <div className={styles.accesoInfo}>
              <div className={styles.accesoTitulo}>Balance</div>
              <div className={styles.accesoDesc}>Activo, pasivo y patrimonio neto</div>
            </div>
            <span className={styles.accesoArrow}>→</span>
          </Link>
          <Link href="/dashboard/pyg" className={styles.accesoCard}>
            <div className={styles.accesoIcon}>📈</div>
            <div className={styles.accesoInfo}>
              <div className={styles.accesoTitulo}>Pérdidas y Ganancias</div>
              <div className={styles.accesoDesc}>Ingresos, gastos y resultado</div>
            </div>
            <span className={styles.accesoArrow}>→</span>
          </Link>
        </div>
      </section>
    </>
  );
}
