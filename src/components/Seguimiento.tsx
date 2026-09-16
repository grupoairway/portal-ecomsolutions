import type { Paso } from '@/lib/vencimientos-tipos';
import styles from './Seguimiento.module.css';

/**
 * Línea de pasos. Sirve igual para un vencimiento suelto (vencimiento.pasos)
 * que para un periodo entero (seguimientoPeriodo(...).pasos); el texto de cada
 * paso viene ya resuelto.
 */
export default function Seguimiento({ pasos }: { pasos: Paso[] }) {
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
