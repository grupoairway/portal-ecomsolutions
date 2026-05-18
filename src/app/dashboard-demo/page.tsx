'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import MetricCard from '@/components/MetricCard';
import VencimientosList from '@/components/VencimientosList';
import GraficoBarras from '@/components/GraficoBarras';
import GraficoLineas from '@/components/GraficoLineas';
import DashboardNav from '@/components/DashboardNav';
import DocumentosGrid from '@/components/DocumentosGrid';
import ModelosClient from '@/app/dashboard/modelos/ModelosClient';
import type { VencimientoNotion, DocumentoNotion } from '@/lib/notion';
import type { MetricasInforme } from '@/lib/informe-tipos';
import type { ModeloVencimiento } from '@/lib/modelos-tipos';
import AnalisisIA from '@/components/AnalisisIA';
import DescargaPDF from '@/components/DescargaPDF';
import styles from '../dashboard/dashboard.module.css';
import selectorStyles from './demo.module.css';

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

const MODELOS_DEMO: ModeloVencimiento[] = [
  {
    id: 'm1',
    modelo: '303',
    periodo: '1T 2026',
    nombre: 'Modelo 303 - IVA 1T 2026',
    fechaLimite: '2026-04-20',
    estado: 'Listo para presentar',
    borradorUrl: '#',
    resultadoModelo: 'A pagar',
    importeAIngresar: 450,
    confirmacionCliente: null,
    formaPago: null,
    iban: null,
  },
  {
    id: 'm2',
    modelo: '130',
    periodo: '1T 2026',
    nombre: 'Modelo 130 - IRPF 1T 2026',
    fechaLimite: '2026-04-20',
    estado: 'Listo para presentar',
    borradorUrl: '#',
    resultadoModelo: 'A devolver',
    importeAIngresar: 230,
    confirmacionCliente: null,
    formaPago: null,
    iban: null,
  },
];

const CONSULTAS_DEMO = [
  {
    id: 'c1',
    asunto: 'Duda sobre el modelo 303',
    estado: 'Pendiente',
    fecha: '2026-05-13',
    mensaje: 'Buenos días, tengo una duda sobre cómo rellenar la casilla 10 del modelo 303 para este trimestre.',
    respuesta: null,
  },
  {
    id: 'c2',
    asunto: 'Factura de proveedor extranjero',
    estado: 'Respondida',
    fecha: '2026-05-08',
    mensaje: 'Hola, tenemos una factura de un proveedor extranjero y no sabemos cómo declararla.',
    respuesta: 'Buenos días, para facturas de proveedores extranjeros necesitáis aplicar la inversión del sujeto pasivo en el IVA. Os adjuntamos instrucciones detalladas.',
  },
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

function periodoAMetricasInforme(p: typeof PERIODOS_DEMO[0]): MetricasInforme {
  const m = (actual: number, variacion: number) => ({
    actual,
    anterior: Math.round(actual / (1 + variacion / 100)),
    variacion,
  });
  return {
    ingresos: m(p.metricas.ingresos, p.variaciones.ingresos),
    gastos_personal: { actual: Math.round(p.metricas.ingresos * 0.32), anterior: 0, variacion: 0 },
    otros_gastos: { actual: Math.round(p.metricas.ingresos * 0.26), anterior: 0, variacion: 0 },
    resultado_explotacion: { actual: Math.round(p.metricas.resultado * 1.15), anterior: 0, variacion: 0 },
    resultado_ejercicio: m(p.metricas.resultado, p.variaciones.resultado),
    total_activo: m(p.metricas.activo, p.variaciones.activo),
    caja: m(p.metricas.caja, p.variaciones.caja),
    clientes_deudores: { actual: Math.round(p.metricas.activo * 0.14), anterior: 0, variacion: 0 },
    patrimonio_neto: m(p.metricas.patrimonio, p.variaciones.patrimonio),
    deudas_cp: m(p.metricas.deudas, p.variaciones.deudas),
    proveedores: { actual: Math.round(p.metricas.deudas * 0.38), anterior: 0, variacion: 0 },
  };
}

const PERIODOS_DEMO = [
  {
    label: 'Anual 2025',
    metricas: { ingresos: 48500, resultado: 8920, activo: 62400, patrimonio: 24180, caja: 12650, deudas: 18320 },
    variaciones: { ingresos: 12.3, resultado: 157.3, activo: 8.1, patrimonio: 58.4, caja: -5.2, deudas: -15.8 },
  },
  {
    label: '2T 2025',
    metricas: { ingresos: 24800, resultado: 5100, activo: 58900, patrimonio: 22400, caja: 11200, deudas: 19800 },
    variaciones: { ingresos: 8.7, resultado: 42.1, activo: 5.3, patrimonio: 31.2, caja: -2.8, deudas: -8.4 },
  },
  {
    label: '1T 2025',
    metricas: { ingresos: 23700, resultado: 3820, activo: 55200, patrimonio: 20100, caja: 10800, deudas: 21500 },
    variaciones: { ingresos: 4.2, resultado: 18.6, activo: 2.9, patrimonio: 14.7, caja: 3.1, deudas: -3.2 },
  },
];

export default function DashboardDemoPage() {
  const [periodoIdx, setPeriodoIdx] = useState(0);
  const [analisisTexto, setAnalisisTexto] = useState<string | null>(null);
  const periodo = PERIODOS_DEMO[periodoIdx];

  useEffect(() => {
    setAnalisisTexto(null);
  }, [periodoIdx]);

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

        {/* MÉTRICAS CON SELECTOR */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Resumen financiero · {periodo.label}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                className={selectorStyles.selector}
                value={periodoIdx}
                onChange={(e) => setPeriodoIdx(Number(e.target.value))}
              >
                {PERIODOS_DEMO.map((p, i) => (
                  <option key={p.label} value={i}>{p.label}</option>
                ))}
              </select>
              <DescargaPDF
                metricas={periodoAMetricasInforme(periodo)}
                periodo={periodo.label}
                nombreCliente="Empresa Demo S.L."
                analisis={analisisTexto}
                filasBalance={null}
                filasPyG={null}
              />
            </div>
          </div>
          <AnalisisIA
            key={periodo.label}
            metricas={periodoAMetricasInforme(periodo)}
            periodo={periodo.label}
            nombreCliente="Empresa Demo S.L."
            onAnalisis={setAnalisisTexto}
          />
          <div className={styles.metricsGrid}>
            <MetricCard icono="💰" label="Ingresos del período" valor={periodo.metricas.ingresos} variacion={periodo.variaciones.ingresos} />
            <MetricCard icono="📊" label="Resultado del ejercicio" valor={periodo.metricas.resultado} variacion={periodo.variaciones.resultado} />
            <MetricCard icono="🏦" label="Total Activo" valor={periodo.metricas.activo} variacion={periodo.variaciones.activo} />
            <MetricCard icono="🏛️" label="Patrimonio Neto" valor={periodo.metricas.patrimonio} variacion={periodo.variaciones.patrimonio} />
            <MetricCard icono="💵" label="Caja disponible" valor={periodo.metricas.caja} variacion={periodo.variaciones.caja} />
            <MetricCard icono="📋" label="Deudas a corto plazo" valor={periodo.metricas.deudas} variacion={periodo.variaciones.deudas} />
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

        {/* MODELOS FISCALES */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Modelos pendientes de confirmar</h2>
          </div>
          <ModelosClient pendientes={MODELOS_DEMO} historial={[]} demo={true} />
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

        {/* CONSULTAS RECIENTES */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Consultas recientes</h2>
            <Link href="/dashboard/consultas" className={styles.docVerTodos}>
              Nueva consulta →
            </Link>
          </div>
          <div className={styles.sectionCard}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {CONSULTAS_DEMO.map((c, i) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '12px 0',
                    borderBottom: i < CONSULTAS_DEMO.length - 1 ? '1px solid #f3f4f6' : 'none',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.asunto}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      {c.fecha}
                    </div>
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
                    {c.estado}
                  </span>
                </div>
              ))}
            </div>
          </div>
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
