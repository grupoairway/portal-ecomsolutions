'use client';

import Link from 'next/link';
import MetricCard from '@/components/MetricCard';
import VencimientosList from '@/components/VencimientosList';
import GraficoBarras from '@/components/GraficoBarras';
import GraficoLineas from '@/components/GraficoLineas';
import DashboardNav from '@/components/DashboardNav';
import DocumentosGrid from '@/components/DocumentosGrid';
import type { VencimientoNotion, DocumentoNotion } from '@/lib/notion';
import styles from '../dashboard/dashboard.module.css';

const VENCIMIENTOS: VencimientoNotion[] = [
  { id: '1', nombre: 'Modelo 303 - IVA 2T', fecha: '2026-07-20', estado: 'Pendiente' },
  { id: '2', nombre: 'Modelo 130 - IRPF 2T', fecha: '2026-07-20', estado: 'Pendiente' },
  { id: '3', nombre: 'Modelo 111 - Retenciones', fecha: '2026-04-20', estado: 'Presentado' },
];

const DOCUMENTOS: DocumentoNotion[] = [
  { id: 'd1', nombre: 'Modelo 303 - IVA 1T 2026', tipo: 'Modelos presentados', fecha: '2026-04-20', urlDrive: '#', descripcion: null, ejercicio: '2026' },
  { id: 'd2', nombre: 'Modelo 130 - IRPF 1T 2026', tipo: 'Modelos presentados', fecha: '2026-04-20', urlDrive: '#', descripcion: null, ejercicio: '2026' },
  { id: 'd3', nombre: 'Escritura de constitución', tipo: 'Escrituras y contratos', fecha: '2025-01-15', urlDrive: '#', descripcion: null, ejercicio: '2025' },
  { id: 'd4', nombre: 'Nómina Enero 2026', tipo: 'Nóminas', fecha: '2026-01-31', urlDrive: '#', descripcion: null, ejercicio: '2026' },
  { id: 'd5', nombre: 'Notificación AEAT - Renta 2024', tipo: 'Notificaciones', fecha: '2026-03-10', urlDrive: '#', descripcion: null, ejercicio: '2026' },
];

const DATOS_BARRAS = [
  { periodo: 'Ene', ingresos: 36200, gastos: 28100 },
  { periodo: 'Feb', ingresos: 38500, gastos: 29400 },
  { periodo: 'Mar', ingresos: 41000, gastos: 31200 },
  { periodo: 'Abr', ingresos: 44300, gastos: 33800 },
  { periodo: 'May', ingresos: 46800, gastos: 35600 },
  { periodo: 'Jun', ingresos: 48500, gastos: 39580 },
];

const DATOS_LINEAS = [
  { periodo: 'Ene', resultado: 8100 },
  { periodo: 'Feb', resultado: 9100 },
  { periodo: 'Mar', resultado: 9800 },
  { periodo: 'Abr', resultado: 10500 },
  { periodo: 'May', resultado: 11200 },
  { periodo: 'Jun', resultado: 8920 },
];

export default function DashboardDemoPage() {
  return (
    <div className={styles.page}>
      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerLogo}>
            <img
              src="/logo.png"
              alt=""
              style={{ width: '40px', height: '40px', objectFit: 'contain', background: 'transparent' }}
            />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              Ecom<span style={{ color: '#2563eb' }}>Solutions</span>
            </span>
          </div>

          <div className={styles.headerRight}>
            <div className={styles.headerUser}>
              <span className={styles.headerNombre}>Hola, Empresa Demo S.L.</span>
              <span className={styles.badgeAcceso}>Último acceso: hoy</span>
            </div>
            <button type="button" className={styles.btnLogout} disabled>
              Cerrar sesión
            </button>
          </div>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navInner}>
            <DashboardNav />
          </div>
        </nav>
      </header>

      {/* MAIN */}
      <main className={styles.main}>

        {/* BANNER DEMO */}
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 10,
          padding: '12px 20px',
          fontSize: 13,
          color: '#92400e',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span>⚠️</span>
          <span><strong>Modo demo</strong> — Datos de ejemplo. Esta página no requiere autenticación.</span>
        </div>

        {/* VENCIMIENTOS */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Vencimientos próximos</h2>
          </div>
          <div className={styles.sectionCard}>
            <VencimientosList vencimientos={VENCIMIENTOS} />
          </div>
        </section>

        {/* MÉTRICAS */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Resumen financiero</h2>
          </div>
          <div className={styles.metricsGrid}>
            <MetricCard icono="💰" label="Ingresos del período" valor={48500} variacion={12.3} />
            <MetricCard icono="📊" label="Resultado del ejercicio" valor={8920} variacion={157.3} />
            <MetricCard icono="🏦" label="Total Activo" valor={62400} variacion={8.1} />
            <MetricCard icono="🏛️" label="Patrimonio Neto" valor={24180} variacion={58.4} />
            <MetricCard icono="💵" label="Caja disponible" valor={12650} variacion={-5.2} />
            <MetricCard icono="📋" label="Deudas a corto plazo" valor={18320} variacion={-15.8} />
          </div>
        </section>

        {/* GRÁFICOS */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Evolución</h2>
          <div className={styles.graficosGrid}>
            <GraficoBarras datos={DATOS_BARRAS} titulo="Ingresos y gastos por período" />
            <GraficoLineas datos={DATOS_LINEAS} titulo="Resultado del ejercicio" />
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
            <div className={styles.docsRecentesGrid}>
              {DOCUMENTOS.slice(0, 3).map((doc) => (
                <div key={doc.id} className={styles.docRecienteItem}>
                  <div className={styles.docRecienteIcono}>
                    {({ 'Modelos presentados': '📄', 'Escrituras y contratos': '📋', 'Nóminas': '💰', 'Notificaciones': '🔔', 'Otros': '📁' } as Record<string, string>)[doc.tipo] ?? '📁'}
                  </div>
                  <div className={styles.docRecienteInfo}>
                    <div className={styles.docRecienteNombre}>{doc.nombre}</div>
                    <div className={styles.docRecienteMeta}>{doc.tipo}</div>
                  </div>
                  {doc.urlDrive && doc.urlDrive !== '#' && (
                    <a href={doc.urlDrive} target="_blank" rel="noopener noreferrer" className={styles.docRecienteLink}>
                      Abrir →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* DOCUMENTOS COMPLETOS */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Mis documentos</h2>
          </div>
          <DocumentosGrid documentos={DOCUMENTOS} />
        </section>

        {/* ACCESOS RÁPIDOS */}
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

      </main>
    </div>
  );
}
