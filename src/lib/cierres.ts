/**
 * Consultas a la base "BD - Control de cierres" de Notion.
 *
 * El modelo de datos y todo lo que no toca la red está en cierres-tipos.ts,
 * que sí pueden importar los componentes de cliente. Aquí se re-exporta entero
 * para que el servidor tenga un único punto de entrada.
 *
 * Esta base la comparte el panel interno (ecom-dashboard). El portal solo
 * escribe los cuatro campos del cliente; ni Estado, ni Fecha cierre, ni Notas,
 * ni las casillas de trabajo interno se tocan desde aquí.
 */

import { cache } from 'react';
import { Client } from '@notionhq/client';
import {
  ejercicioDeMes,
  mapear,
  nombreMes,
  primerDia,
  type Cierre,
  type ConfirmacionCliente,
} from './cierres-tipos';

export * from './cierres-tipos';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

/**
 * Todos los cierres mensuales del cliente.
 *
 * Va envuelto en cache() porque lo piden la portada (tareas y seguimiento del
 * trimestre) y la pantalla de Documentación: sin esto se consultaría Notion
 * varias veces en la misma petición.
 */
export const getCierresCliente = cache(async function getCierresCliente(
  clienteId: string,
): Promise<Cierre[]> {
  const resultados: unknown[] = [];
  let cursor: string | undefined;

  do {
    const res = await notion.databases.query({
      database_id: process.env.NOTION_CIERRES_DB!,
      filter: {
        and: [
          { property: 'Cliente', relation: { contains: clienteId } },
          { property: 'Tipo', select: { equals: 'Mensual' } },
        ],
      },
      sorts: [{ property: 'Mes', direction: 'ascending' }],
      start_cursor: cursor,
      page_size: 100,
    });
    resultados.push(...res.results);
    cursor = res.next_cursor ?? undefined;
  } while (cursor);

  return resultados.map(mapear).filter((c) => c.mes !== '');
});

/** El cierre de un mes concreto, o null si esa fila aún no existe. */
export async function getCierreMes(
  clienteId: string,
  mes: string,
): Promise<Cierre | null> {
  const res = await notion.databases.query({
    database_id: process.env.NOTION_CIERRES_DB!,
    filter: {
      and: [
        { property: 'Cliente', relation: { contains: clienteId } },
        { property: 'Tipo', select: { equals: 'Mensual' } },
        { property: 'Mes', date: { equals: primerDia(mes) } },
      ],
    },
    page_size: 1,
  });

  const page = res.results[0];
  return page ? mapear(page) : null;
}

/**
 * La fila del mes, creándola si el panel interno todavía no la ha creado.
 *
 * Se crea con el mismo formato que usa el panel ("Cliente — Mes Año", con
 * raya larga) para que las dos herramientas vean lo mismo. El Ejercicio es un
 * select de Notion con opciones fijas: si el año no existe como opción, se
 * crea la fila sin ejercicio en vez de fallar y dejar al cliente sin poder
 * confirmar; ya lo rellenará el panel.
 */
export async function asegurarFilaMes(
  clienteId: string,
  clienteNombre: string,
  mes: string,
): Promise<Cierre> {
  const existente = await getCierreMes(clienteId, mes);
  if (existente) return existente;

  const periodo = nombreMes(mes);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const propiedades: Record<string, any> = {
    Nombre: { title: [{ text: { content: `${clienteNombre} — ${periodo}` } }] },
    Cliente: { relation: [{ id: clienteId }] },
    Tipo: { select: { name: 'Mensual' } },
    'Período': { rich_text: [{ text: { content: periodo } }] },
    Mes: { date: { start: primerDia(mes) } },
    Estado: { select: { name: 'Pendiente' } },
    'Confirmación cliente': { select: { name: 'Pendiente' } },
    Ejercicio: { select: { name: ejercicioDeMes(mes) } },
  };

  try {
    const page = await notion.pages.create({
      parent: { database_id: process.env.NOTION_CIERRES_DB! },
      properties: propiedades,
    });
    return mapear(page);
  } catch (error) {
    console.error('No se pudo crear la fila del cierre con Ejercicio:', error);
    delete propiedades.Ejercicio;
    const page = await notion.pages.create({
      parent: { database_id: process.env.NOTION_CIERRES_DB! },
      properties: propiedades,
    });
    return mapear(page);
  }
}

export interface DatosConfirmacion {
  tipo: Extract<ConfirmacionCliente, 'Confirmado' | 'Sin movimientos'>;
  observaciones?: string | null;
  clienteNombre: string;
  clienteEmail: string;
}

/**
 * Guarda la confirmación del cliente. Escribe exclusivamente los cuatro
 * campos del portal: el resto de la fila es del panel interno.
 *
 * La fecha va CON HORA porque la confirmación es prueba ante el cliente.
 */
export async function confirmarCierre(
  cierreId: string,
  datos: DatosConfirmacion,
): Promise<string> {
  const ahora = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const propiedades: Record<string, any> = {
    'Confirmación cliente': { select: { name: datos.tipo } },
    'Fecha confirmación': { date: { start: ahora } },
    'Confirmado por': {
      rich_text: [
        { text: { content: `${datos.clienteNombre} <${datos.clienteEmail}>` } },
      ],
    },
  };

  const observaciones = datos.observaciones?.trim();
  if (observaciones) {
    propiedades['Observaciones cliente'] = {
      rich_text: [{ text: { content: observaciones.slice(0, 2000) } }],
    };
  }

  await notion.pages.update({ page_id: cierreId, properties: propiedades });
  return ahora;
}
