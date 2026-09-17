/**
 * Utilidades de fecha del portal.
 *
 * Regla del proyecto: las fechas de Notion se comparan y se guardan usando
 * solo los 10 primeros caracteres (YYYY-MM-DD). Notion devuelve las fechas
 * con zona horaria (…T00:00:00.000+02:00) y construir un Date con eso
 * desplaza el día en España. Aquí nunca se pasa por Date salvo con UTC.
 */

/** Deja una fecha de Notion en YYYY-MM-DD. */
export function soloFecha(valor: string | null | undefined): string | null {
  if (!valor) return null;
  return valor.slice(0, 10);
}

/** Hoy en YYYY-MM-DD, hora española. */
export function hoy(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
}

/** Suma (o resta, con días negativos) días naturales a una fecha YYYY-MM-DD. */
export function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.slice(0, 10).split('-').map(Number);
  const t = Date.UTC(a, m - 1, d) + dias * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

/** Días naturales de `desde` a `hasta`. Negativo si `hasta` ya pasó. */
export function diasEntre(desde: string, hasta: string): number {
  const p = (f: string) => {
    const [a, m, d] = f.slice(0, 10).split('-').map(Number);
    return Date.UTC(a, m - 1, d);
  };
  return Math.round((p(hasta) - p(desde)) / 86400000);
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** "13 de octubre" — sin año, para plazos del año en curso. */
export function fechaLarga(valor: string | null | undefined): string {
  const f = soloFecha(valor);
  if (!f) return '';
  const [, m, d] = f.split('-').map(Number);
  return `${d} de ${MESES[m - 1]}`;
}

/** "13 de octubre de 2026" — cuando el año importa. */
export function fechaLargaConAnio(valor: string | null | undefined): string {
  const f = soloFecha(valor);
  if (!f) return '';
  const [a] = f.split('-').map(Number);
  return `${fechaLarga(f)} de ${a}`;
}

/** "13 oct" — para listados compactos. */
export function fechaCorta(valor: string | null | undefined): string {
  const f = soloFecha(valor);
  if (!f) return '';
  const [, m, d] = f.split('-').map(Number);
  return `${d} ${MESES[m - 1].slice(0, 3)}`;
}

/**
 * "13 de octubre de 2026 a las 17:42" — para la conformidad, que es prueba
 * ante el cliente y por eso se muestra siempre con la hora.
 */
export function fechaHoraLarga(valor: string | null | undefined): string {
  if (!valor) return '';
  if (valor.length <= 10) return fechaLargaConAnio(valor);
  const hora = new Date(valor).toLocaleTimeString('es-ES', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${fechaLargaConAnio(valor)} a las ${hora}`;
}

/**
 * Formato de los importes del portal.
 *
 * `useGrouping: 'always'` es necesario: el español, por defecto, no separa los
 * millares de los números de cuatro cifras, así que 1450,80 saldría sin punto
 * y desalineado con el resto de la columna.
 */
const FORMATO_EUROS = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: 'always',
});

/** Signo menos tipográfico (U+2212), que se distingue de un guion. */
const MENOS = '−';

/**
 * Importe en euros: "1.450,80 €", "−2.100,00 €".
 *
 * `signoAscii` deja el guion normal para el PDF: las fuentes estándar de
 * jsPDF no tienen el signo menos tipográfico y lo pintarían roto.
 */
export function euros(
  n: number | null | undefined,
  opciones: { signoAscii?: boolean } = {},
): string {
  if (n == null) return '';
  const texto = FORMATO_EUROS.format(n);
  return `${opciones.signoAscii ? texto : texto.replace(/^-/, MENOS)} €`;
}

/**
 * Número con un decimal: "17,6", "−28,9".
 *
 * Lleva el mismo signo menos que los importes, a propósito: así todos los
 * negativos del portal dependen del mismo carácter y se comportan igual.
 */
export function decimal(
  n: number | null | undefined,
  opciones: { signoAscii?: boolean } = {},
): string {
  if (n == null) return '';
  const texto = n.toLocaleString('es-ES', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return opciones.signoAscii ? texto : texto.replace(/^-/, MENOS);
}

/**
 * Porcentaje del portal: "17,6 %", "−28,9 %". Siempre un decimal, como el
 * panel interno.
 *
 * `signoAscii`, como en euros(), es para el PDF.
 */
export function porcentaje(
  n: number | null | undefined,
  opciones: { signoAscii?: boolean } = {},
): string {
  if (n == null) return '';
  return `${decimal(n, opciones)} %`;
}
