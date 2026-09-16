'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { euros } from '@/lib/fechas';
import styles from './GraficoBarras.module.css';

export interface PuntoBarras {
  /** Lo que se lee bajo la barra: "jul", "ene 26". */
  etiqueta: string;
  /** null = ese mes no tiene informe publicado. Queda como hueco. */
  ingresos: number | null;
  gastos: number | null;
}

interface Props {
  datos: PuntoBarras[];
  titulo?: string;
  /** Explicación bajo la gráfica, por ejemplo por qué faltan meses. */
  nota?: string;
}

/** Eje corto: "48K €". Los importes completos van en el tooltip. */
function formatearEje(valor: number): string {
  if (Math.abs(valor) >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)}M €`;
  if (Math.abs(valor) >= 1_000) return `${Math.round(valor / 1_000)}K €`;
  return `${valor} €`;
}

export default function GraficoBarras({ datos, titulo, nota }: Props) {
  const hayDatos = datos.some((d) => d.ingresos !== null || d.gastos !== null);

  if (!hayDatos) {
    return (
      <div className={styles.empty}>
        <p>Todavía no hay meses publicados para dibujar la evolución.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {titulo && <h3 className={styles.titulo}>{titulo}</h3>}
      <ResponsiveContainer width="100%" height={280}>
        {/* barGap deja 2px de superficie entre las dos barras del mes. */}
        <BarChart data={datos} margin={{ top: 4, right: 8, left: 0, bottom: 4 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
          <XAxis
            dataKey="etiqueta"
            tick={{ fontSize: 12, fill: 'var(--muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatearEje}
            tick={{ fontSize: 12, fill: 'var(--muted)' }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip
            cursor={{ fill: 'var(--brand-soft)', opacity: 0.5 }}
            formatter={(valor: number) => euros(valor)}
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              color: 'var(--ink)',
              fontSize: 13,
            }}
            labelStyle={{ color: 'var(--muted)' }}
          />
          <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} iconType="square" />
          <Bar dataKey="ingresos" name="Ingresos" fill="var(--serie-1)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="gastos" name="Gastos" fill="var(--serie-2)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      {nota && <p className={styles.nota}>{nota}</p>}
    </div>
  );
}
