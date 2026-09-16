'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { euros } from '@/lib/fechas';
import styles from './GraficoLineas.module.css';

export interface PuntoLinea {
  etiqueta: string;
  esteAnio: number | null;
  /** null cuando el informe no trae comparación con el ejercicio anterior. */
  anioAnterior: number | null;
}

interface Props {
  datos: PuntoLinea[];
  titulo?: string;
  /** Nombres de las dos series; normalmente los dos ejercicios. */
  nombres: { esteAnio: string; anioAnterior: string };
  nota?: string;
}

function formatearEje(valor: number): string {
  if (Math.abs(valor) >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)}M €`;
  if (Math.abs(valor) >= 1_000) return `${Math.round(valor / 1_000)}K €`;
  return `${valor} €`;
}

export default function GraficoLineas({ datos, titulo, nombres, nota }: Props) {
  if (!datos.some((d) => d.esteAnio !== null)) {
    return (
      <div className={styles.empty}>
        <p>Todavía no hay informes para dibujar el resultado del ejercicio.</p>
      </div>
    );
  }

  // Con una sola serie no hace falta leyenda: el título ya la nombra.
  const hayAnioAnterior = datos.some((d) => d.anioAnterior !== null);

  return (
    <div className={styles.wrapper}>
      {titulo && <h3 className={styles.titulo}>{titulo}</h3>}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={datos} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
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
          {/* El resultado puede ser negativo: el cero tiene que verse. */}
          <ReferenceLine y={0} stroke="var(--line)" />
          {hayAnioAnterior && (
            <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} iconType="plainline" />
          )}
          <Line
            type="monotone"
            dataKey="esteAnio"
            name={nombres.esteAnio}
            stroke="var(--serie-1)"
            strokeWidth={2}
            dot={{ fill: 'var(--serie-1)', r: 4 }}
            activeDot={{ r: 6 }}
          />
          {hayAnioAnterior && (
            // Trazo discontinuo: el año pasado se distingue también sin color.
            <Line
              type="monotone"
              dataKey="anioAnterior"
              name={nombres.anioAnterior}
              stroke="var(--serie-2)"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={{ fill: 'var(--serie-2)', r: 4 }}
              activeDot={{ r: 6 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      {nota && <p className={styles.nota}>{nota}</p>}
    </div>
  );
}
