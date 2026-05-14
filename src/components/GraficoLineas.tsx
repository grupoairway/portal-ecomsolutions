'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import styles from './GraficoLineas.module.css';

interface DatoResultado {
  periodo: string;
  resultado: number;
}

interface GraficoLineasProps {
  datos: DatoResultado[];
  titulo?: string;
}

function formatearEje(valor: number): string {
  if (Math.abs(valor) >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)}M€`;
  if (Math.abs(valor) >= 1_000) return `${(valor / 1_000).toFixed(0)}K€`;
  return `${valor}€`;
}

export default function GraficoLineas({ datos, titulo }: GraficoLineasProps) {
  if (!datos || datos.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No hay datos de resultado disponibles</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {titulo && <h3 className={styles.titulo}>{titulo}</h3>}
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={datos} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
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
          <ReferenceLine y={0} stroke="#e5e7eb" />
          <Line
            type="monotone"
            dataKey="resultado"
            name="Resultado"
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={{ fill: '#2563eb', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
