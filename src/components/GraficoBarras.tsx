'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import styles from './GraficoBarras.module.css';

interface DatoPeriodo {
  periodo: string;
  ingresos: number;
  gastos: number;
}

interface GraficoBarrasProps {
  datos: DatoPeriodo[];
  titulo?: string;
}

function formatearEje(valor: number): string {
  if (Math.abs(valor) >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)}M€`;
  if (Math.abs(valor) >= 1_000) return `${(valor / 1_000).toFixed(0)}K€`;
  return `${valor}€`;
}

export default function GraficoBarras({ datos, titulo }: GraficoBarrasProps) {
  if (!datos || datos.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No hay datos de evolución disponibles</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {titulo && <h3 className={styles.titulo}>{titulo}</h3>}
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={datos} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="periodo"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatearEje}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip
            formatter={(value: number) =>
              new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
            }
            contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 13, paddingTop: 12 }}
            iconType="square"
          />
          <Bar dataKey="ingresos" name="Ingresos" fill="#2563eb" radius={[4, 4, 0, 0]} />
          <Bar dataKey="gastos" name="Gastos" fill="#bfdbfe" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
