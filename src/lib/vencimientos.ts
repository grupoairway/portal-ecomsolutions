/**
 * Consultas a la base "BD - Vencimientos del" de Notion.
 *
 * El modelo de datos y todo lo que no toca la red está en vencimientos-tipos.ts,
 * que sí pueden importar los componentes de cliente. Aquí se re-exporta entero
 * para que el servidor tenga un único punto de entrada.
 *
 * Los campos "Email * enviado" son de n8n y este módulo no los toca.
 */

import { cache } from 'react';
import { Client } from '@notionhq/client';
import { getPerfilCliente } from './notion';
import { mapear, type Vencimiento } from './vencimientos-tipos';

export * from './vencimientos-tipos';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

/**
 * Todos los vencimientos del cliente, del más próximo al más lejano.
 *
 * Va envuelto en cache() porque el layout (para el contador de la barra
 * lateral) y la página piden lo mismo en la misma petición: sin esto se
 * consultaría Notion dos veces por pantalla.
 */
export const getVencimientos = cache(async function getVencimientos(
  clienteId: string,
): Promise<Vencimiento[]> {
  // El certificado digital decide quién paga, y vive en la ficha del cliente.
  // getPerfilCliente está cacheada, así que no añade una consulta por pantalla.
  const perfil = await getPerfilCliente(clienteId);
  const contexto = { clienteConCertificado: perfil?.certificadoDigital ?? false };

  const resultados: unknown[] = [];
  let cursor: string | undefined;

  do {
    const res = await notion.databases.query({
      database_id: process.env.NOTION_VENCIMIENTOS_DB!,
      filter: { property: 'Cliente', relation: { contains: clienteId } },
      sorts: [{ property: 'Fecha límite', direction: 'ascending' }],
      start_cursor: cursor,
      page_size: 100,
    });
    resultados.push(...res.results);
    cursor = res.next_cursor ?? undefined;
  } while (cursor);

  return resultados.map((page) => mapear(page, contexto));
});

/** Un vencimiento suelto, comprobando que pertenece al cliente de la sesión. */
export async function getVencimiento(
  id: string,
  clienteId: string,
): Promise<Vencimiento | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const page = (await notion.pages.retrieve({ page_id: id })) as any;
  const relacionados: string[] = (page.properties?.Cliente?.relation ?? []).map(
    (r: { id: string }) => r.id,
  );
  // Notion devuelve los ids con guiones; los de la sesión pueden venir sin.
  const normalizar = (s: string) => s.replace(/-/g, '');
  if (!relacionados.some((r) => normalizar(r) === normalizar(clienteId))) {
    return null;
  }

  const perfil = await getPerfilCliente(clienteId);
  return mapear(page, {
    clienteConCertificado: perfil?.certificadoDigital ?? false,
  });
}
