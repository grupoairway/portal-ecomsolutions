import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { verifyToken } from '@/lib/auth';
import { obtenerVencimientosCliente } from '@/lib/notion';
import MetricCard from '@/components/MetricCard';
import VencimientosList from '@/components/VencimientosList';
import GraficoBarras from '@/components/GraficoBarras';
import GraficoLineas from '@/components/GraficoLineas';
import styles from './dashboard.module.css';

async function logout() {
  'use server';
  cookies().delete('portal_session');
  redirect('/');
}

export default async function DashboardPage() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('portal_session')?.value;

  if (!sessionToken) redirect('/');

  const session = await verifyToken(sessionToken);
  if (!session) redirect('/');

  const vencimientos = await obtenerVencimientosCliente(session.clienteId).catch(() => []);

  // Datos de ejemplo para gráficos (en producción vendrían del Excel subido)
  const datosGraficoBarra: { periodo: string; ingresos: number; gastos: number }[] = [];
  const datosGraficoLinea: { periodo: string; resultado: number }[] = [];

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
              <span className={styles.headerNombre}>Hola, {session.nombre}</span>
              <span className={styles.badgeAcceso}>Último acceso: hoy</span>
            </div>
            <form action={logout}>
              <button type="submit" className={styles.btnLogout}>
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className={styles.main}>

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

      </main>
    </div>
  );
}
