'use client';

import { useState, useEffect, useMemo } from 'react';
import MetricCard from '@/components/MetricCard';
import AnalisisIA from '@/components/AnalisisIA';
import DescargaPDF from '@/components/DescargaPDF';
import { parseMetricas } from '@/lib/informe-tipos';
import { parseExcelFilas } from '@/lib/balance-tipos';
import type { InformeNotion } from '@/lib/informe-tipos';
import styles from './FinancieroSection.module.css';

interface Props {
  informes: InformeNotion[];
  nombreCliente?: string;
}

function etiquetaPeriodo(informe: InformeNotion): string {
  return informe.periodo || informe.ejercicio || 'Sin período';
}

export default function FinancieroSection({ informes, nombreCliente = 'tu empresa' }: Props) {
  const [idx, setIdx] = useState(0);
  const [analisisTexto, setAnalisisTexto] = useState<string | null>(null);

  // Resetear análisis al cambiar período
  useEffect(() => {
    setAnalisisTexto(null);
  }, [idx]);

  if (informes.length === 0) {
    return (
      <div className={styles.empty}>
        Aún no hay informes disponibles. Tu gestor los publicará próximamente.
      </div>
    );
  }

  const informe = informes[Math.min(idx, informes.length - 1)];
  const metricas = informe.metricasJSON ? parseMetricas(informe.metricasJSON) : null;
  const titulo = `Resumen financiero · ${etiquetaPeriodo(informe)}`;

  // Parsear filas de balance y PyG del informe seleccionado
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const filasBalance = useMemo(() => {
    if (!informe.balanceJSON) return null;
    try {
      const data = JSON.parse(informe.balanceJSON) as { activo?: unknown[]; pasivo?: unknown[] };
      const activo = parseExcelFilas(data.activo ?? [], 'activo');
      const pasivo = parseExcelFilas(data.pasivo ?? [], 'pasivo');
      return [...activo, ...pasivo];
    } catch {
      return null;
    }
  }, [informe.balanceJSON]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const filasPyG = useMemo(() => {
    if (!informe.pygJSON) return null;
    try {
      const data = JSON.parse(informe.pygJSON) as unknown[] | { pyg?: unknown[] };
      const rows = Array.isArray(data) ? data : (data.pyg ?? []);
      return parseExcelFilas(rows, 'pyg');
    } catch {
      return null;
    }
  }, [informe.pygJSON]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h2 className={styles.title}>{titulo}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {informes.length > 1 && (
            <select
              className={styles.selector}
              value={idx}
              onChange={(e) => setIdx(Number(e.target.value))}
            >
              {informes.map((inf, i) => (
                <option key={inf.id} value={i}>
                  {etiquetaPeriodo(inf)}
                </option>
              ))}
            </select>
          )}
          {metricas && (
            <DescargaPDF
              metricas={metricas}
              periodo={etiquetaPeriodo(informe)}
              nombreCliente={nombreCliente}
              analisis={analisisTexto}
              filasBalance={filasBalance}
              filasPyG={filasPyG}
            />
          )}
        </div>
      </div>

      {!metricas ? (
        <div className={styles.empty}>Sin datos financieros para este período.</div>
      ) : (
        <>
          <AnalisisIA
            key={etiquetaPeriodo(informe)}
            metricas={metricas}
            periodo={etiquetaPeriodo(informe)}
            nombreCliente={nombreCliente}
            onAnalisis={setAnalisisTexto}
          />
          <div className={styles.grid}>
            <MetricCard icono="💰" label="Ingresos" valor={metricas.ingresos?.actual} variacion={metricas.ingresos?.variacion} />
            <MetricCard icono="👥" label="Gastos de personal" valor={metricas.gastos_personal?.actual} variacion={metricas.gastos_personal?.variacion} />
            <MetricCard icono="📋" label="Otros gastos" valor={metricas.otros_gastos?.actual} variacion={metricas.otros_gastos?.variacion} />
            <MetricCard icono="⚙️" label="Resultado de explotación" valor={metricas.resultado_explotacion?.actual} variacion={metricas.resultado_explotacion?.variacion} />
            <MetricCard icono="📊" label="Resultado del ejercicio" valor={metricas.resultado_ejercicio?.actual} variacion={metricas.resultado_ejercicio?.variacion} />
            <MetricCard icono="🏦" label="Total Activo" valor={metricas.total_activo?.actual} variacion={metricas.total_activo?.variacion} />
            <MetricCard icono="💵" label="Caja disponible" valor={metricas.caja?.actual} variacion={metricas.caja?.variacion} />
            <MetricCard icono="🧾" label="Clientes deudores" valor={metricas.clientes_deudores?.actual} variacion={metricas.clientes_deudores?.variacion} />
            <MetricCard icono="🏛️" label="Patrimonio Neto" valor={metricas.patrimonio_neto?.actual} variacion={metricas.patrimonio_neto?.variacion} />
            <MetricCard icono="⏱️" label="Deudas a corto plazo" valor={metricas.deudas_cp?.actual} variacion={metricas.deudas_cp?.variacion} />
            <MetricCard icono="🏪" label="Proveedores" valor={metricas.proveedores?.actual} variacion={metricas.proveedores?.variacion} />
          </div>
        </>
      )}
    </div>
  );
}
