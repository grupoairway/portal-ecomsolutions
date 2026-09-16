/**
 * Límite de una petición al día por cliente.
 *
 * Se guarda en memoria del proceso. Es suficiente para frenar los clics
 * repetidos, que es el caso real, pero NO es un límite duro: en Vercel cada
 * instancia tiene su propia memoria y se reinicia en cada despliegue, así que
 * un cliente insistente podría colar alguna petición de más.
 *
 * Si hiciera falta un límite de verdad, el sitio natural es un campo de fecha
 * en la ficha del cliente en Notion.
 */

import { hoy } from './fechas';

const ultimaPeticion = new Map<string, string>();

export interface ResultadoLimite {
  permitido: boolean;
  /** Día en el que ya se pidió (YYYY-MM-DD), si se ha bloqueado. */
  yaPedidoEl?: string;
}

/**
 * Registra una petición y dice si se puede seguir. `clave` debe identificar a
 * la vez al cliente y a la acción, p. ej. `invitacion-quantum:<clienteId>`.
 */
export function permitirUnaVezAlDia(clave: string): ResultadoLimite {
  const dia = hoy();
  const anterior = ultimaPeticion.get(clave);

  if (anterior === dia) {
    return { permitido: false, yaPedidoEl: anterior };
  }

  ultimaPeticion.set(clave, dia);
  return { permitido: true };
}

/** Solo para pruebas: olvida lo registrado. */
export function olvidarLimites(): void {
  ultimaPeticion.clear();
}
