import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { decodeSession } from '@/lib/session';
import { obtenerVencimientosCliente, getDocumentosCliente, getInformesCliente, buscarClientePorEmail } from '@/lib/notion';
import { parseMetricas } from '@/lib/informe-tipos';
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

  const documentosRecientes = documentos.slice(0, 3) as DocumentoNotion[];

  console.log('Vencimientos totales recibidos:', vencimientos?.length);
  console.log('Hoy:', new Date().toISOString().split('T')[0]);
  console.log('Primeros 3:', JSON.stringify(vencimientos?.slice(0, 3)));

  // Split vencimientos: próximos (>= hoy) y historial reciente (últimos 90 días)
  const hoyISO = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const hace90ISO = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const vencimientosProximos = vencimientos.filter(v => !v.fecha || v.fecha >= hoyISO);
  console.log('Próximos filtrados:', vencimientosProximos?.length);
  const vencimientosHistorial = vencimientos.filter(
    v => v.fecha && v.fecha < hoyISO && v.fecha >= hace90ISO,
  );

  // Build chart data from all informes, sorted chronologically
  const sortedInformes = [...informes].sort((a, b) => a.fechaSubida.localeCompare(b.fechaSubida));
  const datosGraficoBarra = sortedInformes
    .map(inf => {
      if (!inf.metricasJSON) return null;
      const m = parseMetricas(inf.metricasJSON);
      return {
        periodo: inf.periodo || inf.ejercicio || 'Sin período',
        ingresos: m.ingresos.actual,
        gastos: Math.abs(m.otros_gastos.actual) + Math.abs(m.gastos_personal.actual),
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  const datosGraficoLinea = sortedInformes
    .map(inf => {
      if (!inf.metricasJSON) return null;
      const m = parseMetricas(inf.metricasJSON);
      return {
        periodo: inf.periodo || inf.ejercicio || 'Sin período',
        resultado: m.resultado_ejercicio.actual,
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  return (
    <>
      {/* VENCIMIENTOS */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Vencimientos próximos</h2>
        </div>
        <div className={styles.sectionCard}>
          <VencimientosList vencimientos={vencimientosProximos} />
        </div>
        {vencimientosHistorial.length > 0 && (
          <>
            <div className={styles.sectionHeader} style={{ marginTop: 24 }}>
              <h2 className={styles.sectionTitle}>Historial reciente</h2>
            </div>
            <div className={styles.sectionCard}>
              <VencimientosList vencimientos={vencimientosHistorial} />
            </div>
          </>
        )}
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
