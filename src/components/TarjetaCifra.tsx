import { euros } from '@/lib/fechas';
import type { Cifra, Comparacion } from '@/lib/evolucion-tipos';
import styles from './TarjetaCifra.module.css';

/**
 * Una cifra de "Mi evolución" con sus comparaciones.
 *
 * Cada comparación lleva su flecha y su color, pero también el texto de la
 * referencia y el importe: el sentido nunca depende solo del color.
 *
 * Los porcentajes solo se pintan cuando vienen: sobre una base negativa o a
 * cero no significan nada, y en ese caso se enseña la cifra a secas.
 */
export default function TarjetaCifra({ cifra }: { cifra: Cifra }) {
  return (
    <div className={styles.card}>
      <span className={styles.etiqueta}>{cifra.etiqueta}</span>
      <span className={styles.valor}>{formatear(cifra.valor, cifra.formato)}</span>

      {(cifra.mesAnterior || cifra.anioAnterior) && (
        <div className={styles.comparaciones}>
          {cifra.mesAnterior && (
            <Linea comparacion={cifra.mesAnterior} cifra={cifra} />
          )}
          {cifra.anioAnterior && (
            <Linea comparacion={cifra.anioAnterior} cifra={cifra} />
          )}
        </div>
      )}
    </div>
  );
}

function Linea({
  comparacion,
  cifra,
}: {
  comparacion: Comparacion;
  cifra: Cifra;
}) {
  const cambio = comparacion.puntos ?? comparacion.pct;
  const sube = cambio !== null && cambio > 0;
  const baja = cambio !== null && cambio < 0;

  // En los gastos, subir es la mala noticia.
  const bueno = cifra.mejorSiSube ? sube : baja;
  const malo = cifra.mejorSiSube ? baja : sube;

  return (
    <p className={styles.comparacion}>
      {cambio !== null && (
        <span
          className={`${styles.cambio} ${bueno ? styles.bueno : malo ? styles.malo : ''}`}
        >
          {sube ? '▲' : baja ? '▼' : '='}{' '}
          {comparacion.puntos !== null
            ? `${numero(Math.abs(comparacion.puntos), 1)} puntos`
            : `${numero(Math.abs(comparacion.pct!), comparacion.pct! >= 10 ? 0 : 1)} %`}
        </span>
      )}
      <span className={styles.referencia}>
        frente a {comparacion.referencia}
        {comparacion.valor !== null
          ? ` (${formatear(comparacion.valor, cifra.formato)})`
          : ''}
      </span>
    </p>
  );
}

function formatear(valor: number | null, formato: Cifra['formato']): string {
  if (valor === null) return '—';
  return formato === 'porcentaje' ? `${numero(valor, 1)} %` : euros(valor);
}

function numero(n: number, decimales: number): string {
  return n.toLocaleString('es-ES', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}
