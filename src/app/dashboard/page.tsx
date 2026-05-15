import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { decodeSession } from '@/lib/session';
import { getVencimientosCliente, getDocumentosCliente, getInformesCliente, buscarClientePorEmail } from '@/lib/notion';
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

  const [vencimientos, documentos, informes, consultasRes] = await Promise.all([
    getVencimientosCliente(session.clienteId).catch(() => []),
    getDocumentosCliente(session.clienteId).catch(() => []),
    getInformesCliente(session.clienteId).catch(() => []),
    fetch(
      `${process.env.BASE_URL ?? 'http://localhost:3000'}/api/consultas?clienteId=${session.clienteId}`,
      { cache: 'no-store' },
    ).catch(() => null),
  ]);

  interface ConsultaResumen { id: string; asunto: string; estado: string; fecha: string | null; }
  const consultasRecientes: ConsultaResumen[] = (consultasRes && consultasRes.ok)
    ? ((await consultasRes.json()) as ConsultaResumen[]).slice(0, 2)
    : [];

  const documentosRecientes = documentos.slice(0, 3) as DocumentoNotion[];

  // El componente VencimientosList separa internamente vencidos/próximos

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
          <h2 className={styles.sectionTitle}>Vencimientos</h2>
        </div>
        <div className={styles.sectionCard}>
          <VencimientosList vencimientos={vencimientos} />
        </div>
      </section>

      {/* RESUMEN FINANCIERO */}
      <section className={styles.section}>
        <FinancieroSection informes={informes} nombreCliente={nombreCliente} />
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

      {/* CONSULTAS RECIENTES */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Consultas recientes</h2>
          <Link href="/dashboard/consultas" className={styles.docVerTodos}>
            Nueva consulta →
          </Link>
        </div>
        <div className={styles.sectionCard}>
          {consultasRecientes.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
              <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>
                No has enviado ninguna consulta todavía.
              </p>
              <Link
                href="/dashboard/consultas"
                style={{
                  display: 'inline-block',
                  border: '1px solid var(--color-blue)',
                  color: 'var(--color-blue)',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Hacer una consulta
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {consultasRecientes.map((c, i) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '12px 0',
                    borderBottom: i < consultasRecientes.length - 1 ? '1px solid #f3f4f6' : 'none',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.asunto}
                    </div>
                    {c.fecha && (
                      <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>
                        {formatearFechaCorta(c.fecha)}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 20,
                    whiteSpace: 'nowrap',
                    background: c.estado === 'Respondida' ? '#dcfce7' : '#fef3c7',
                    color: c.estado === 'Respondida' ? '#15803d' : '#92400e',
                  }}>
                    {c.estado === 'Nueva' ? 'Pendiente' : c.estado}
                  </span>
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
