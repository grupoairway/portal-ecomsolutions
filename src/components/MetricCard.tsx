import { euros, porcentaje } from '@/lib/fechas';
import styles from './MetricCard.module.css';

interface MetricCardProps {
  icono: string;
  label: string;
  valor?: number;
  variacion?: number | null;
  formato?: 'euros' | 'numero';
}

function formatearValor(n: number, formato: 'euros' | 'numero'): string {
  if (formato === 'euros') return euros(n);
  return n.toLocaleString('es-ES');
}

export default function MetricCard({
  icono,
  label,
  valor,
  variacion,
  formato = 'euros',
}: MetricCardProps) {
  const valorValido = valor !== undefined && valor !== null;
  const tieneVariacion = variacion !== null && variacion !== undefined;
  const esPositiva = tieneVariacion && variacion! > 0;
  const esNegativa = tieneVariacion && variacion! < 0;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.icon}>{icono}</span>
        {tieneVariacion && (
          esPositiva ? (
            <span className={`${styles.badge} ${styles.badgePositive}`}>
              ▲ +{porcentaje(variacion!)}
            </span>
          ) : esNegativa ? (
            <span className={`${styles.badge} ${styles.badgeNegative}`}>
              ▼ {porcentaje(variacion!)}
            </span>
          ) : (
            <span className={`${styles.badge} ${styles.badgeNeutral}`}>
              —
            </span>
          )
        )}
      </div>
      <div className={styles.valor}>
        {valorValido ? formatearValor(valor!, formato) : '—'}
      </div>
      <div className={styles.label}>{label}</div>
    </div>
  );
}
