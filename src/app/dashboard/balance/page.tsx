'use client';

import { useState } from 'react';
import TablaContable from '@/components/TablaContable';
import type { BalanceData } from '@/lib/excel-parser';
import styles from './balance.module.css';

export default function BalancePage() {
  const [datos, setDatos] = useState<BalanceData | null>(null);
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
      form.append('tipo', 'balance');

      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Error al procesar el archivo.');
      } else {
        setDatos(json.data as BalanceData);
      }
    } catch {
      setError('Error de conexión al subir el archivo.');
    } finally {
      setCargando(false);
      e.target.value = '';
    }
  }

  return (
    <div className={styles.content}>
      <div className={styles.topBar}>
        <h1 className={styles.h1}>Balance de situación</h1>
        <div className={styles.actions}>
          <label className={styles.uploadLabel} htmlFor="upload-balance">
            {datos ? '↑ Actualizar Excel' : '↑ Subir Excel'}
          </label>
          <input
            id="upload-balance"
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
          <p className={styles.uploadTitle}>Sube el Excel de Balance</p>
          <p className={styles.uploadDesc}>
            Acepta archivos .xlsx con hojas &quot;A C T I V O&quot; y &quot;P A S I V O&quot;
          </p>
          <label className={styles.uploadLabel} htmlFor="upload-balance">
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
          <div className={styles.seccion}>
            <h2 className={styles.seccionTitle}>Activo</h2>
            <TablaContable filas={datos.activo.filas} />
          </div>
          <div className={styles.seccion}>
            <h2 className={styles.seccionTitle}>Pasivo y Patrimonio Neto</h2>
            <TablaContable filas={datos.pasivo.filas} />
          </div>
        </>
      )}
    </div>
  );
}
