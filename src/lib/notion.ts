import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export interface ClienteNotion {
  id: string;
  nombre: string;
  email: string;
}

export interface VencimientoNotion {
  id: string;
  nombre: string;
  fecha: string;
  estado: 'Pendiente' | 'Presentado' | 'Urgente';
}

export async function buscarClientePorEmail(
  email: string,
): Promise<ClienteNotion | null> {
  const response = await notion.databases.query({
    database_id: process.env.NOTION_CLIENTES_DB!,
    filter: {
      property: 'Email',
      email: { equals: email },
    },
  });

  if (response.results.length === 0) return null;

  const page = response.results[0] as unknown as {
    id: string;
    properties: {
      Nombre: { title: Array<{ plain_text: string }> };
      Email: { email: string };
    };
  };

  return {
    id: page.id,
    nombre: page.properties.Nombre.title[0]?.plain_text ?? '',
    email: page.properties.Email.email ?? '',
  };
}

export async function obtenerVencimientosCliente(
  clienteId: string,
): Promise<VencimientoNotion[]> {
  const response = await notion.databases.query({
    database_id: process.env.NOTION_VENCIMIENTOS_DB!,
    filter: {
      property: 'Cliente',
      relation: { contains: clienteId },
    },
    sorts: [{ property: 'Fecha de vencimiento', direction: 'ascending' }],
  });

  return response.results.map((page) => {
    const p = page as unknown as {
      id: string;
      properties: {
        'Nombre del vencimiento': { title: Array<{ plain_text: string }> };
        'Fecha de vencimiento': { date: { start: string } | null };
        Estado: { select: { name: string } | null };
      };
    };

    return {
      id: p.id,
      nombre: p.properties['Nombre del vencimiento'].title[0]?.plain_text ?? '',
      fecha: p.properties['Fecha de vencimiento'].date?.start ?? '',
      estado: (p.properties.Estado.select?.name ?? 'Pendiente') as
        | 'Pendiente'
        | 'Presentado'
        | 'Urgente',
    };
  });
}
