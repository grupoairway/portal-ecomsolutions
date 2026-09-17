import { decimal, euros, porcentaje } from '@/lib/fechas';
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

      {(cifra.principal || cifra.secundaria) && (
        <div className={styles.comparaciones}>
          {cifra.principal && (
            <Linea comparacion={cifra.principal} cifra={cifra} />
          )}
          {cifra.secundaria && (
            <Linea comparacion={cifra.secundaria} cifra={cifra} secundaria />
          )}
        </div>
      )}
    </div>
  );
}

function Linea({
  comparacion,
  cifra,
  secundaria = false,
}: {
  comparacion: Comparacion;
  cifra: Cifra;
  /** La de abajo: el mismo período del año pasado, en pequeño. */
  secundaria?: boolean;
}) {
  const cambio = comparacion.puntos ?? comparacion.pct;
  const sube = cambio !== null && cambio > 0;
  const baja = cambio !== null && cambio < 0;

  // En los gastos, subir es la mala noticia.
  const bueno = cifra.mejorSiSube ? sube : baja;
  const malo = cifra.mejorSiSube ? baja : sube;

  return (
    <p
      className={`${styles.comparacion} ${secundaria ? styles.secundaria : ''}`}
    >
      {cambio !== null && (
        <span
          className={`${styles.cambio} ${bueno ? styles.bueno : malo ? styles.malo : ''}`}
        >
          {sube ? '▲' : baja ? '▼' : '='}{' '}
          {comparacion.puntos !== null
            ? `${decimal(Math.abs(comparacion.puntos))} puntos`
            : porcentaje(Math.abs(comparacion.pct!))}
        </span>
      )}
      <span className={styles.referencia}>
        {frenteA(comparacion.referencia)}
        {comparacion.valor !== null
          ? ` (${formatear(comparacion.valor, cifra.formato)})`
          : ''}
      </span>
    </p>
  );
}

/**
 * "frente a junio", pero "frente al mismo tramo de 2025": en español la
 * preposición y el artículo se contraen.
 */
function frenteA(referencia: string): string {
  return referencia.startsWith('el ')
    ? `frente al ${referencia.slice(3)}`
    : `frente a ${referencia}`;
}

function formatear(valor: number | null, formato: Cifra['formato']): string {
  if (valor === null) return '—';
  return formato === 'porcentaje' ? porcentaje(valor) : euros(valor);
}
