import { Client } from '@notionhq/client';
export type { MetricasInforme, InformeNotion } from './informe-tipos';
export { parseMetricas } from './informe-tipos';

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

export type TipoDocumento =
  | 'Modelos presentados'
  | 'Escrituras y contratos'
  | 'Nóminas'
  | 'Notificaciones'
  | 'Otros';

export interface DocumentoNotion {
  id: string;
  nombre: string;
  tipo: TipoDocumento;
  fecha: string | null;
  urlDrive: string | null;
  descripcion: string | null;
  ejercicio: string | null;
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

export async function getInformesCliente(
  clienteId: string,
): Promise<import('./informe-tipos').InformeNotion[]> {
  console.log('Buscando informes para clienteId:', clienteId)
  console.log('NOTION_INFORMES_DB:', process.env.NOTION_INFORMES_DB)

  const response = await notion.databases.query({
    database_id: process.env.NOTION_INFORMES_DB!,
    filter: {
      and: [
        { property: 'Cliente', relation: { contains: clienteId } },
      ],
    },
    sorts: [{ property: 'Fecha subida', direction: 'descending' }],
  });

  console.log('Informes encontrados:', response.results.length)

  return response.results.map((page) => {
    const p = page as unknown as {
      id: string;
      properties: Record<string, unknown>;
    };

    // Log de las claves reales para detectar discrepancias de nombre
    console.log('Propiedades del informe:', Object.keys(p.properties))

    const metricasRaw =
      (p.properties['Métricas JSON'] as { rich_text?: Array<{ plain_text: string }> } | undefined)?.rich_text?.[0]?.plain_text ||
      (p.properties['MetricasJSON'] as { rich_text?: Array<{ plain_text: string }> } | undefined)?.rich_text?.[0]?.plain_text ||
      (p.properties['Metricas JSON'] as { rich_text?: Array<{ plain_text: string }> } | undefined)?.rich_text?.[0]?.plain_text
    console.log('MetricasRAW:', metricasRaw?.substring(0, 500))

    function getRichText(key: string): string | null {
      const prop = p.properties[key] as { rich_text?: Array<{ plain_text: string }> } | undefined;
      const value = prop?.rich_text?.[0]?.plain_text ?? null;
      console.log(`Campo "${key}":`, value ? `${value.substring(0, 80)}...` : 'null');
      return value;
    }

    function getSelect(key: string): string | null {
      const prop = p.properties[key] as { select?: { name: string } | null; rich_text?: Array<{ plain_text: string }> } | undefined;
      return prop?.select?.name ?? prop?.rich_text?.[0]?.plain_text ?? null;
    }

    function getDate(key: string): string | null {
      const prop = p.properties[key] as { date?: { start: string } | null } | undefined;
      return prop?.date?.start ?? null;
    }

    // Soporte para nombres con y sin espacio / tilde
    const metricasJSON =
      getRichText('Métricas JSON') ??
      getRichText('MétricasJSON') ??
      getRichText('Metricas JSON') ??
      getRichText('MetricasJSON');

    const balanceJSON =
      getRichText('Balance JSON') ??
      getRichText('BalanceJSON');

    const pygJSON =
      getRichText('PyG JSON') ??
      getRichText('PyGJSON') ??
      getRichText('PYG JSON');

    return {
      id: p.id,
      periodo: getSelect('Período') ?? getSelect('Periodo') ?? '',
      ejercicio: getSelect('Ejercicio') ?? '',
      fechaSubida: getDate('Fecha subida') ?? '',
      metricasJSON,
      balanceJSON,
      pygJSON,
    };
  });
}

export async function getUltimoInforme(
  clienteId: string,
): Promise<import('./informe-tipos').InformeNotion | null> {
  const informes = await getInformesCliente(clienteId);
  return informes[0] ?? null;
}

export async function getDocumentosCliente(
  clienteId: string,
): Promise<DocumentoNotion[]> {
  const response = await notion.databases.query({
    database_id: process.env.NOTION_DOCUMENTOS_DB!,
    filter: {
      and: [
        { property: 'Cliente', relation: { contains: clienteId } },
        { property: 'Visible en portal', checkbox: { equals: true } },
      ],
    },
    sorts: [{ property: 'Fecha', direction: 'descending' }],
  });

  return response.results.map((page) => {
    const p = page as unknown as {
      id: string;
      properties: {
        Nombre: { title: Array<{ plain_text: string }> };
        Tipo: { select: { name: string } | null };
        Fecha: { date: { start: string } | null };
        'URL Drive': { url: string | null };
        'Descripción': { rich_text: Array<{ plain_text: string }> };
        Ejercicio: { select: { name: string } | null };
      };
    };

    return {
      id: p.id,
      nombre: p.properties.Nombre.title[0]?.plain_text ?? '',
      tipo: (p.properties.Tipo.select?.name ?? 'Otros') as TipoDocumento,
      fecha: p.properties.Fecha.date?.start ?? null,
      urlDrive: p.properties['URL Drive'].url ?? null,
      descripcion: p.properties['Descripción'].rich_text[0]?.plain_text ?? null,
      ejercicio: p.properties.Ejercicio.select?.name ?? null,
    };
  });
}
