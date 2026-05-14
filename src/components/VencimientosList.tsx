import styles from './VencimientosList.module.css';
import type { VencimientoNotion } from '@/lib/notion';

interface VencimientosListProps {
  vencimientos: VencimientoNotion[];
}

function diasRestantes(fecha: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fVenc = new Date(fecha);
  fVenc.setHours(0, 0, 0, 0);
  return Math.ceil((fVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

function formatearFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const ESTADO_CONFIG = {
  Pendiente: { clase: 'badgeWarning', label: 'Pendiente' },
  Presentado: { clase: 'badgeSuccess', label: 'Presentado' },
  Urgente: { clase: 'badgeDanger', label: 'Urgente' },
} as const;

export default function VencimientosList({ vencimientos }: VencimientosListProps) {
  if (vencimientos.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>✓</span>
        <p>Todo al día. No hay vencimientos próximos.</p>
      </div>
    );
  }

  return (
    <ul className={styles.lista}>
      {vencimientos.map((v) => {
        const dias = v.fecha ? diasRestantes(v.fecha) : null;
        const config = ESTADO_CONFIG[v.estado] ?? ESTADO_CONFIG.Pendiente;

        return (
          <li key={v.id} className={styles.item}>
            <div className={styles.itemLeft}>
              <span className={styles.nombre}>{v.nombre}</span>
              {v.fecha && (
                <span className={styles.fecha}>{formatearFecha(v.fecha)}</span>
              )}
            </div>
            <div className={styles.itemRight}>
              <span className={`${styles.badge} ${styles[config.clase]}`}>
                {config.label}
              </span>
              {dias !== null && (
                <span
                  className={`${styles.dias} ${
                    dias < 0
                      ? styles.diasVencido
                      : dias <= 7
                      ? styles.diasUrgente
                      : styles.diasNormal
                  }`}
                >
                  {dias < 0
                    ? `Hace ${Math.abs(dias)}d`
                    : dias === 0
                    ? 'Hoy'
                    : `${dias}d`}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
