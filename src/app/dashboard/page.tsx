import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { decodeSession } from '@/lib/session';
import { obtenerVencimientosCliente, getDocumentosCliente, getInformesCliente, buscarClientePorEmail } from '@/lib/notion';
import type { DocumentoNotion } from '@/lib/notion';
import VencimientosList from '@/components/VencimientosList';
import GraficoBarras from '@/components/GraficoBarras';
import GraficoLineas from '@/components/GraficoLineas';
import FinancieroSection from '@/components/FinancieroSection';
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
  const sessionCookie = cookies().get('portal_session');
  if (!sessionCookie) redirect('/');
  const session = decodeSession(sessionCookie.value);
  if (!session) redirect('/');

  console.log('=== DASHBOARD ===')
  console.log('Session cookie value (primeros 100 chars):', sessionCookie?.value?.substring(0, 100))
  console.log('clienteId decodificado:', session?.clienteId)
  console.log('email decodificado:', session?.email)
  console.log('nombre decodificado:', session?.nombre)

  // Fallback: si la sesión no tiene nombre (cookie antigua), buscarlo en Notion
  let nombreCliente = session.nombre
  if (!nombreCliente || nombreCliente === 'Cliente') {
    const clienteNotion = await buscarClientePorEmail(session.email).catch(() => null)
    if (clienteNotion?.nombre) nombreCliente = clienteNotion.nombre
  }

  const [vencimientos, documentos, informes] = await Promise.all([
    obtenerVencimientosCliente(session.clienteId).catch(() => []),
    getDocumentosCliente(session.clienteId).catch(() => []),
    getInformesCliente(session.clienteId).catch(() => []),
  ]);

  const primerInforme = informes[0] ?? null;
  console.log('Informe encontrado:', primerInforme?.id)
  console.log('MetricasJSON length:', primerInforme?.metricasJSON?.length)
  console.log('MetricasJSON preview:', primerInforme?.metricasJSON?.substring(0, 200))

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
        <FinancieroSection informes={informes} />
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
