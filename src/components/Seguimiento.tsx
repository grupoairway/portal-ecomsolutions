import type { Vencimiento } from '@/lib/vencimientos-tipos';
import styles from './Seguimiento.module.css';

/**
 * Línea de pasos del vencimiento. El texto de cada paso lo decide
 * construirPasos() en lib/vencimientos.ts; aquí solo se pinta.
 */
export default function Seguimiento({ vencimiento }: { vencimiento: Vencimiento }) {
  const pasos = vencimiento.pasos;

  return (
    <ol
      className={styles.track}
      style={{ gridTemplateColumns: `repeat(${pasos.length}, 1fr)` }}
    >
      {pasos.map((paso) => (
        <li key={paso.clave} className={`${styles.step} ${styles[paso.estado]}`}>
          <span className={styles.dot} />
          <b>{paso.titulo}</b>
          <small>{paso.detalle}</small>
        </li>
      ))}
    </ol>
  );
}
