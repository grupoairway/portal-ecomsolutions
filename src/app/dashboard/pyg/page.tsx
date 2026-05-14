'use client';

import { useState } from 'react';
import Link from 'next/link';
import TablaContable from '@/components/TablaContable';
import MetricCard from '@/components/MetricCard';
import type { PyGData } from '@/lib/excel-parser';
import styles from './pyg.module.css';

export default function PyGPage() {
  const [datos, setDatos] = useState<PyGData | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setCargando(true);
    setError('');

    try {
      const form = new FormData();
      form.append('archivo', archivo);
      form.append('tipo', 'pyg');

      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Error al procesar el archivo.');
      } else {
        setDatos(json.data as PyGData);
      }
    } catch {
      setError('Error de conexión al subir el archivo.');
    } finally {
      setCargando(false);
      e.target.value = '';
    }
  }

  function calcVariacion(actual: number, anterior: number): number | null {
    if (anterior === 0) return null;
    return ((actual - anterior) / Math.abs(anterior)) * 100;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/dashboard" className={styles.back}>
            ← Dashboard
          </Link>
          <span className={styles.separator}>/</span>
          <span className={styles.pageTitle}>Pérdidas y Ganancias</span>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.topBar}>
          <h1 className={styles.h1}>Cuenta de Pérdidas y Ganancias</h1>
          <div>
            <label className={styles.uploadLabel} htmlFor="upload-pyg">
              {datos ? '↑ Actualizar Excel' : '↑ Subir Excel'}
            </label>
            <input
              id="upload-pyg"
              type="file"
              accept=".xlsx,.xls"
              className={styles.uploadInput}
              onChange={handleUpload}
            />
          </div>
        </div>

        {error && <div className={styles.uploadError}>{error}</div>}

        {!datos && !cargando && (
          <div className={styles.uploadArea}>
            <p className={styles.uploadTitle}>Sube el Excel de PyG</p>
            <p className={styles.uploadDesc}>
              Acepta archivos .xlsx con hoja &quot;PyG&quot;
            </p>
            <label className={styles.uploadLabel} htmlFor="upload-pyg">
              Seleccionar archivo
            </label>
          </div>
        )}

        {cargando && (
          <div className={styles.uploadArea}>
            <p className={styles.uploadLoading}>⏳ Procesando el archivo Excel...</p>
          </div>
        )}

        {datos && (
          <>
            <div className={styles.metricsRow}>
              <MetricCard
                icono="💰"
                label="Ingresos del período"
                valor={datos.metricas.ingresos}
                variacion={calcVariacion(datos.metricas.ingresos, datos.metricas.ingresosAnterior)}
              />
              <MetricCard
                icono="📊"
                label="Resultado del ejercicio"
                valor={datos.metricas.resultado}
                variacion={calcVariacion(datos.metricas.resultado, datos.metricas.resultadoAnterior)}
              />
            </div>
            <TablaContable filas={datos.hoja.filas} titulo="Detalle PyG" />
          </>
        )}
      </main>
    </div>
  );
}
