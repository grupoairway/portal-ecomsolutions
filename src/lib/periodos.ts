/**
 * Agrupación de vencimientos por periodo.
 *
 * En la portada el cliente no sigue un modelo suelto, sino el trimestre
 * entero: "Tercer trimestre 2026" avanza cuando TODOS los modelos de ese
 * periodo han completado el paso. Un 303 conforme no adelanta el trimestre si
 * el 111 sigue sin borrador.
 *
 * Módulo puro: no habla con Notion.
 */

import { fechaHoraLarga, fechaLarga, soloFecha } from './fechas';
import {
  ORDEN_PASOS,
  type ClavePaso,
  type Paso,
  type Vencimiento,
} from './vencimientos-tipos';

const ORDINALES = ['', 'Primer', 'Segundo', 'Tercer', 'Cuarto'];

/**
 * "3T 2026" -> "Tercer trimestre 2026"
 * "2P 2026" -> "Segundo pago a cuenta 2026"
 * "Anual 2026" -> "Ejercicio 2026"
 * Cualquier otra cosa se deja tal cual.
 */
export function nombrePeriodo(periodo: string): string {
  const trimestre = periodo.match(/^([1-4])T\s*(\d{4})$/i);
  if (trimestre) {
    return `${ORDINALES[Number(trimestre[1])]} trimestre ${trimestre[2]}`;
  }

  const pago = periodo.match(/^([1-4])P\s*(\d{4})$/i);
  if (pago) {
    return `${ORDINALES[Number(pago[1])]} pago a cuenta ${pago[2]}`;
  }

  const anual = periodo.match(/^Anual\s*(\d{4})$/i);
  if (anual) return `Ejercicio ${anual[1]}`;

  return periodo;
}

/** Año al que pertenece un periodo ("3T 2026" -> 2026). */
export function anioPeriodo(periodo: string): number | null {
  const m = periodo.match(/(\d{4})/);
  return m ? Number(m[1]) : null;
}

export interface SeguimientoPeriodo {
  periodo: string;
  /** "Tercer trimestre 2026" */
  titulo: string;
  vencimientos: Vencimiento[];
  pasos: Paso[];
}

/** La fecha más próxima de una lista, ignorando las vacías. */
function masProxima(fechas: Array<string | null>): string | null {
  const validas = fechas
    .map((f) => soloFecha(f))
    .filter((f): f is string => f !== null)
    .sort();
  return validas[0] ?? null;
}

/**
 * El periodo que toca seguir en la portada: el del borrador que espera
 * conformidad; si no hay ninguno, el del vencimiento abierto más próximo.
 */
export function periodoActivo(vencimientos: Vencimiento[]): string | null {
  const esperando = vencimientos.find((v) => v.esperaConformidad);
  if (esperando?.periodo) return esperando.periodo;

  const abierto = vencimientos
    .filter((v) => !v.presentado && v.fechaLimite)
    .sort((a, b) =>
      (soloFecha(a.fechaLimite) ?? '').localeCompare(soloFecha(b.fechaLimite) ?? ''),
    )[0];

  return abierto?.periodo ?? null;
}

/**
 * Seguimiento conjunto de todos los modelos de un periodo. Un paso solo se da
 * por hecho si lo han completado todos.
 */
export function seguimientoPeriodo(
  vencimientos: Vencimiento[],
  periodo: string,
): SeguimientoPeriodo | null {
  const grupo = vencimientos.filter((v) => v.periodo === periodo);
  if (grupo.length === 0) return null;

  const total = grupo.length;
  const cuantos = (clave: ClavePaso) =>
    grupo.filter((v) => v.progreso[clave]).length;

  const hechos = {} as Record<ClavePaso, boolean>;
  for (const clave of ORDEN_PASOS) hechos[clave] = cuantos(clave) === total;

  const todosPresentados = grupo.every((v) => v.presentado);
  // El cargo solo entra en el recorrido si algún modelo del periodo lo tiene.
  const hayCargo = grupo.some(
    (v) => !!v.fechaCargo || (v.resultado === 'A pagar' && !v.presentado),
  );

  /** "2 de 4 modelos" cuando el periodo va a medias. */
  const parcial = (clave: ClavePaso, sinNinguno: string) => {
    const n = cuantos(clave);
    if (n === 0) return sinNinguno;
    return total === 1 ? sinNinguno : `${n} de ${total} modelos`;
  };

  const unico = total === 1 ? grupo[0] : null;

  function detalleConformidad(): string {
    if (hechos.conformidad) {
      if (unico?.conformidadFecha) {
        return `Dada el ${fechaHoraLarga(unico.conformidadFecha)}`;
      }
      // Dada por hecha porque ya se presentó, sin registro de conformidad.
      return grupo.every((v) => v.conformidadFecha)
        ? 'Dada'
        : 'Sin registro en el portal';
    }
    const plazo = masProxima(
      grupo.filter((v) => !v.conformidadFecha).map((v) => v.plazoConformidad),
    );
    if (plazo) return `Antes del ${fechaLarga(plazo)}`;
    return parcial('conformidad', 'Pendiente');
  }

  function detallePresentacion(): string {
    if (todosPresentados) {
      return unico?.fechaPresentacion
        ? `Presentado el ${fechaLarga(unico.fechaPresentacion)}`
        : 'Presentados';
    }
    const limite = masProxima(
      grupo.filter((v) => !v.presentado).map((v) => v.fechaLimitePresentacion),
    );
    return limite ? `Antes del ${fechaLarga(limite)}` : 'La hacemos nosotros';
  }

  function detalleBorrador(): string {
    if (!hechos.borrador) return parcial('borrador', 'Los preparamos nosotros');
    const publicacion = masProxima(grupo.map((v) => v.fechaPublicacionBorrador));
    if (publicacion) return `Publicado el ${fechaLarga(publicacion)}`;
    return total === 1 ? 'Publicado' : 'Publicados';
  }

  const definicion: Array<{ clave: ClavePaso; titulo: string; detalle: string }> = [
    {
      clave: 'documentacion',
      titulo: 'Documentación',
      detalle: hechos.documentacion
        ? 'Completa'
        : parcial('documentacion', 'Pendiente de completar'),
    },
    { clave: 'borrador', titulo: 'Borrador', detalle: detalleBorrador() },
    { clave: 'conformidad', titulo: 'Tu conformidad', detalle: detalleConformidad() },
    { clave: 'presentacion', titulo: 'Presentación', detalle: detallePresentacion() },
    {
      clave: 'cargo',
      titulo: 'Cargo en cuenta',
      detalle:
        masProxima(grupo.map((v) => v.fechaCargo)) !== null
          ? fechaLarga(masProxima(grupo.map((v) => v.fechaCargo)))
          : 'Pendiente',
    },
  ];

  const visibles = hayCargo ? definicion : definicion.slice(0, 4);
  const primeraPendiente = visibles.findIndex((p) => !hechos[p.clave]);

  return {
    periodo,
    titulo: nombrePeriodo(periodo),
    vencimientos: grupo,
    pasos: visibles.map((p, i) => ({
      ...p,
      estado: hechos[p.clave]
        ? ('hecho' as const)
        : i === primeraPendiente
          ? ('ahora' as const)
          : ('pendiente' as const),
    })),
  };
}
