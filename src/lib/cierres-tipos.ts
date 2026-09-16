/**
 * Modelo de datos de la base "BD - Control de cierres" de Notion.
 *
 * Una fila mensual es "el mes de un cliente": lo que la gestoría necesita
 * para contabilizarlo. La comparte el panel interno, así que el portal solo
 * escribe cuatro campos, los que pone el cliente:
 *
 *   Confirmación cliente · Fecha confirmación · Confirmado por · Observaciones cliente
 *
 * El resto (Estado, Fecha cierre, Notas y las casillas de trabajo interno) es
 * del panel y aquí nunca se toca.
 *
 * Módulo puro: no habla con Notion, así que puede importarse también desde
 * componentes de cliente. Las consultas están en cierres.ts.
 *
 * Un "mes" aquí es siempre la cadena "YYYY-MM". En Notion se guarda en la
 * propiedad "Mes" como fecha del día 1, y se compara por los 10 primeros
 * caracteres, nunca construyendo un Date, para no desplazar el día.
 */

import { fechaLarga, hoy, soloFecha } from './fechas';
import type { TonoChip } from '@/components/Chip';

/** Cuántos meses ya cerrados puede confirmar el cliente hacia atrás. */
export const MESES_CONFIRMABLES = 3;

/** Día del mes siguiente en que vence la confirmación. */
export const DIA_PLAZO = 5;

export type ConfirmacionCliente = 'Pendiente' | 'Confirmado' | 'Sin movimientos';

export interface Cierre {
  id: string;
  /** "YYYY-MM". */
  mes: string;
  /** "Septiembre 2026", tal y como está en Notion. */
  periodo: string;
  confirmacion: ConfirmacionCliente;
  /** Con hora: es prueba ante el cliente. */
  fechaConfirmacion: string | null;
  confirmadoPor: string | null;
  observaciones: string | null;
  /** La gestoría ya ha recogido la documentación del mes. */
  docsRecibidas: boolean;
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/* -----------------------------------------------------------------
 * Aritmética de meses, sin pasar por Date
 * ----------------------------------------------------------------- */

/** Suma (o resta, con n negativo) meses a un "YYYY-MM". */
export function sumarMeses(mes: string, n: number): string {
  const [anio, m] = mes.slice(0, 7).split('-').map(Number);
  const total = anio * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

/** El mes en curso, hora española. */
export function mesActual(): string {
  return hoy().slice(0, 7);
}

/** El mes de una fecha de Notion ("2026-08-01T00:00…" -> "2026-08"). */
export function mesDeFecha(valor: string | null | undefined): string | null {
  const f = soloFecha(valor);
  return f ? f.slice(0, 7) : null;
}

/**
 * Los meses de las tarjetas: los confirmables más el mes en curso, del más
 * antiguo al más reciente.
 */
export function mesesTarjetas(referencia: string = mesActual()): string[] {
  return [...mesesConfirmables(referencia), referencia];
}

/**
 * Los meses que el cliente puede confirmar: los ya cerrados, del más antiguo
 * al más reciente. El mes en curso no está: aún no ha terminado.
 */
export function mesesConfirmables(referencia: string = mesActual()): string[] {
  return Array.from({ length: MESES_CONFIRMABLES }, (_, i) =>
    sumarMeses(referencia, i - MESES_CONFIRMABLES),
  );
}

/** El día 1 del mes, que es lo que guarda la propiedad "Mes" de Notion. */
export function primerDia(mes: string): string {
  return `${mes}-01`;
}

/** Fecha límite para confirmar un mes: el día 5 del mes siguiente. */
export function plazoCierre(mes: string): string {
  return `${sumarMeses(mes, 1)}-${String(DIA_PLAZO).padStart(2, '0')}`;
}

/** "2026-08" -> "Agosto 2026". Es el formato de "Período" en Notion. */
export function nombreMes(mes: string): string {
  const [anio, m] = mes.slice(0, 7).split('-').map(Number);
  const nombre = MESES[m - 1];
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`;
}

/** "2026-08" -> "agosto". Para frases: "la documentación de agosto". */
export function mesEnFrase(mes: string): string {
  return MESES[Number(mes.slice(5, 7)) - 1];
}

/** "2026-08" -> "agosto de 2026", cuando el año importa. */
export function mesEnFraseConAnio(mes: string): string {
  return `${mesEnFrase(mes)} de ${mes.slice(0, 4)}`;
}

/** Ejercicio al que pertenece el mes, para el select de Notion. */
export function ejercicioDeMes(mes: string): string {
  return mes.slice(0, 4);
}

/**
 * Los tres meses de un trimestre fiscal: "3T 2026" -> julio, agosto y
 * septiembre. Devuelve [] para periodos que no son trimestres (anuales,
 * pagos a cuenta), donde la confirmación mensual no aplica.
 */
export function mesesDeTrimestre(periodo: string): string[] {
  const m = periodo.match(/^([1-4])T\s*(\d{4})$/i);
  if (!m) return [];
  const primero = (Number(m[1]) - 1) * 3 + 1;
  return [0, 1, 2].map((i) => `${m[2]}-${String(primero + i).padStart(2, '0')}`);
}

/* -----------------------------------------------------------------
 * Estados
 * ----------------------------------------------------------------- */

/** El cliente ya ha dicho lo que tenía que decir de este mes. */
export function estaConfirmado(cierre: Cierre | null | undefined): boolean {
  return (
    cierre?.confirmacion === 'Confirmado' ||
    cierre?.confirmacion === 'Sin movimientos'
  );
}

/**
 * El mes está cerrado y el cliente aún no lo ha confirmado.
 *
 * Si "Docs recibidas" ya está marcada, la gestoría tiene la documentación y no
 * se le pide nada más: confirmar entonces sería papeleo por papeleo.
 */
export function estaPendiente(
  cierre: Cierre | null | undefined,
  mes: string,
  referencia: string = mesActual(),
): boolean {
  if (mes >= referencia) return false;
  if (estaConfirmado(cierre)) return false;
  return !cierre?.docsRecibidas;
}

/**
 * El chip de la tarjeta de cada mes. El orden importa: "Revisada" manda sobre
 * todo lo demás porque significa que la documentación ya está en la gestoría,
 * que es el final del recorrido.
 */
export function estadoTarjeta(
  cierre: Cierre | null | undefined,
  mes: string,
  referencia: string = mesActual(),
): { texto: string; tono: TonoChip } {
  if (cierre?.docsRecibidas) return { texto: 'Revisada', tono: 'ok' };
  if (cierre?.confirmacion === 'Confirmado') {
    return { texto: 'Confirmada por ti', tono: 'ok' };
  }
  if (cierre?.confirmacion === 'Sin movimientos') {
    return { texto: 'Sin movimientos', tono: 'neutral' };
  }
  if (mes >= referencia) return { texto: 'Aún no', tono: 'neutral' };

  const plazo = plazoCierre(mes);
  if (plazo < hoy()) {
    return { texto: `Venció el ${fechaLarga(plazo)}`, tono: 'alert' };
  }
  return { texto: `Hasta el ${fechaLarga(plazo)}`, tono: 'warn' };
}

/**
 * Los meses que el cliente tiene sin confirmar, del más antiguo al más
 * reciente. El panel de Documentación trabaja siempre sobre el primero: si
 * hay atrasos, se ponen al día por orden.
 */
export function mesesPendientes(
  cierres: Cierre[],
  referencia: string = mesActual(),
): string[] {
  const porMes = new Map(cierres.map((c) => [c.mes, c]));
  return mesesConfirmables(referencia).filter((mes) =>
    estaPendiente(porMes.get(mes), mes, referencia),
  );
}

/**
 * El trimestre tiene la documentación completa cuando sus tres meses están
 * confirmados (o sin movimientos, o ya recogidos por nosotros). Un mes que
 * todavía no ha terminado no cuenta como pendiente: no se le puede pedir al
 * cliente que confirme un mes en curso.
 *
 * Devuelve null si el periodo no es un trimestre, para que quien llame sepa
 * que la confirmación mensual no dice nada de ese periodo.
 */
export function documentacionTrimestreCompleta(
  cierres: Cierre[],
  periodo: string,
  referencia: string = mesActual(),
): boolean | null {
  const meses = mesesDeTrimestre(periodo);
  if (meses.length === 0) return null;

  const porMes = new Map(cierres.map((c) => [c.mes, c]));
  return meses.every((mes) => {
    const cierre = porMes.get(mes);
    if (estaConfirmado(cierre) || cierre?.docsRecibidas) return true;
    return mes >= referencia;
  });
}

/** Los meses ya cerrados del trimestre que siguen sin confirmar. */
export function mesesPendientesTrimestre(
  cierres: Cierre[],
  periodo: string,
  referencia: string = mesActual(),
): string[] {
  const porMes = new Map(cierres.map((c) => [c.mes, c]));
  return mesesDeTrimestre(periodo).filter((mes) => {
    const cierre = porMes.get(mes);
    if (estaConfirmado(cierre) || cierre?.docsRecibidas) return false;
    return mes < referencia;
  });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Convierte una página de Notion en un Cierre. */
export function mapear(page: any): Cierre {
  const props = page.properties ?? {};
  const texto = (k: string): string | null =>
    props[k]?.rich_text?.map((t: any) => t.plain_text).join('').trim() || null;

  const mes = mesDeFecha(props['Mes']?.date?.start) ?? '';

  return {
    id: page.id as string,
    mes,
    periodo: texto('Período') ?? (mes ? nombreMes(mes) : ''),
    confirmacion:
      (props['Confirmación cliente']?.select?.name as ConfirmacionCliente) ??
      'Pendiente',
    fechaConfirmacion: props['Fecha confirmación']?.date?.start ?? null,
    confirmadoPor: texto('Confirmado por'),
    observaciones: texto('Observaciones cliente'),
    docsRecibidas: props['Docs recibidas']?.checkbox ?? false,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
