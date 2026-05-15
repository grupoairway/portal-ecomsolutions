import styles from './MetricCard.module.css';

interface MetricCardProps {
  icono: string;
  label: string;
  valor?: number;
  variacion?: number | null;
  formato?: 'euros' | 'numero';
}

function formatearEuros(n: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function MetricCard({
  icono,
  label,
  valor,
  variacion,
  formato = 'euros',
}: MetricCardProps) {
  const isPositive = variacion !== null && variacion !== undefined && variacion >= 0;
  const valorValido = valor !== undefined && valor !== null;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.icon}>{icono}</span>
        {variacion !== null && variacion !== undefined && (
          <span className={`${styles.badge} ${isPositive ? styles.badgePositive : styles.badgeNegative}`}>
            {isPositive ? '▲' : '▼'} {Math.abs(variacion).toFixed(1)}%
          </span>
        )}
      </div>
      <div className={styles.valor}>
        {valorValido
          ? (formato === 'euros' ? formatearEuros(valor!) : valor!.toLocaleString('es-ES'))
          : '—'}
      </div>
      <div className={styles.label}>{label}</div>
    </div>
  );
}
