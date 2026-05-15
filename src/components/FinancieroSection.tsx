'use client';

import { useState } from 'react';
import MetricCard from '@/components/MetricCard';
import { parseMetricas } from '@/lib/informe-tipos';
import type { InformeNotion } from '@/lib/informe-tipos';
import styles from './FinancieroSection.module.css';

interface Props {
  informes: InformeNotion[];
}

function etiquetaPeriodo(informe: InformeNotion): string {
  return informe.periodo || informe.ejercicio || 'Sin período';
}

export default function FinancieroSection({ informes }: Props) {
  const [idx, setIdx] = useState(0);

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

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h2 className={styles.title}>{titulo}</h2>
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
      </div>

      {!metricas ? (
        <div className={styles.empty}>Sin datos financieros para este período.</div>
      ) : (
        <div className={styles.grid}>
          <MetricCard icono="💰" label="Ingresos" valor={metricas.ingresos.actual} variacion={metricas.ingresos.variacion} />
          <MetricCard icono="👥" label="Gastos de personal" valor={metricas.gastos_personal.actual} variacion={metricas.gastos_personal.variacion} />
          <MetricCard icono="📋" label="Otros gastos" valor={metricas.otros_gastos.actual} variacion={metricas.otros_gastos.variacion} />
          <MetricCard icono="⚙️" label="Resultado de explotación" valor={metricas.resultado_explotacion.actual} variacion={metricas.resultado_explotacion.variacion} />
          <MetricCard icono="📊" label="Resultado del ejercicio" valor={metricas.resultado_ejercicio.actual} variacion={metricas.resultado_ejercicio.variacion} />
          <MetricCard icono="🏦" label="Total Activo" valor={metricas.total_activo.actual} variacion={metricas.total_activo.variacion} />
          <MetricCard icono="💵" label="Caja disponible" valor={metricas.caja.actual} variacion={metricas.caja.variacion} />
          <MetricCard icono="🧾" label="Clientes deudores" valor={metricas.clientes_deudores.actual} variacion={metricas.clientes_deudores.variacion} />
          <MetricCard icono="🏛️" label="Patrimonio Neto" valor={metricas.patrimonio_neto.actual} variacion={metricas.patrimonio_neto.variacion} />
          <MetricCard icono="⏱️" label="Deudas a corto plazo" valor={metricas.deudas_cp.actual} variacion={metricas.deudas_cp.variacion} />
          <MetricCard icono="🏪" label="Proveedores" valor={metricas.proveedores.actual} variacion={metricas.proveedores.variacion} />
        </div>
      )}
    </div>
  );
}
