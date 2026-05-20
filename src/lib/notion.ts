import { Client } from '@notionhq/client';
export type { MetricasInforme, InformeNotion } from './informe-tipos';
export { parseMetricas } from './informe-tipos';
export type { ModeloVencimiento } from './modelos-tipos';
import type { ModeloVencimiento } from './modelos-tipos';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export interface ClienteNotion {
  id: string;
  nombre: string;
  email: string;
}

export interface VencimientoNotion {
  id: string;
  nombre: string;
  fecha: string | null;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getVencimientosCliente(clienteId: string): Promise<any[]> {
  const res = await fetch(
    `https://api.notion.com/v1/databases/${process.env.NOTION_VENCIMIENTOS_DB}/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        filter: { property: 'Cliente', relation: { contains: clienteId } },
      }),
      cache: 'no-store',
    },
  );

  const data = await res.json();

  if (!data.results || data.results.length === 0) {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vencimientos = data.results.map((v: any) => ({
    id: v.id,
    nombre: v.properties?.['Título']?.title?.[0]?.plain_text || 'Sin nombre',
    fecha: v.properties?.['Fecha límite']?.date?.start || null,
    estado: v.properties?.Estado?.select?.name || 'Pendiente',
  }));

  console.log('Vencimientos encontrados:', vencimientos.length);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return vencimientos.sort((a: any, b: any) => {
    if (!a.fecha) return 1;
    if (!b.fecha) return -1;
    return a.fecha.localeCompare(b.fecha);
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

export async function getModelosCliente(clienteId: string): Promise<ModeloVencimiento[]> {
  const response = await notion.databases.query({
    database_id: process.env.NOTION_VENCIMIENTOS_DB!,
    filter: {
      and: [
        { property: 'Cliente', relation: { contains: clienteId } },
        {
          or: [
            { property: 'Estado', select: { equals: 'Listo para presentar' } },
            { property: 'Estado', select: { equals: 'Confirmado' } },
            { property: 'Estado', select: { equals: 'Presentado' } },
            { property: 'Estado', select: { equals: 'Domiciliado' } },
          ],
        },
      ],
    },
    sorts: [{ property: 'Fecha límite', direction: 'ascending' }],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return response.results.map((page: any) => {
    const props = page.properties;
    const titulo: string = props['Título']?.title?.[0]?.plain_text ?? '';
    const modeloNum = titulo.match(/\b(\d{3})\b/)?.[1];
    const periodoFromTitle = titulo.match(/(\dT\s*\d{4}|\bAnual\s+\d{4})/i)?.[1]?.trim();

    return {
      id: page.id as string,
      modelo: (props['Modelo']?.select?.name ?? props['Modelo']?.rich_text?.[0]?.plain_text ?? modeloNum ?? titulo) as string,
      periodo: (props['Período']?.select?.name ?? props['Período']?.rich_text?.[0]?.plain_text ?? props['Periodo']?.select?.name ?? periodoFromTitle ?? '') as string,
      nombre: titulo,
      fechaLimite: (props['Fecha límite']?.date?.start ?? null) as string | null,
      estado: (props['Estado']?.select?.name ?? 'Pendiente') as string,
      borradorUrl: (props['Borrador URL']?.url ?? null) as string | null,
      resultadoModelo: (props['Resultado modelo']?.select?.name ?? null) as string | null,
      importeAIngresar: (props['Importe a ingresar']?.number ?? null) as number | null,
      confirmacionCliente: (props['Confirmación cliente']?.select?.name ?? null) as string | null,
      formaPago: (props['Forma pago/cobro']?.select?.name ?? null) as string | null,
      iban: (props['IBAN']?.rich_text?.[0]?.plain_text ?? null) as string | null,
    };
  });
}

export async function getModelosPendientesCount(clienteId: string): Promise<number> {
  const response = await notion.databases.query({
    database_id: process.env.NOTION_VENCIMIENTOS_DB!,
    filter: {
      and: [
        { property: 'Cliente', relation: { contains: clienteId } },
        { property: 'Estado', select: { equals: 'Listo para presentar' } },
      ],
    },
    page_size: 10,
  });
  return response.results.length;
}

export interface VencimientoPendiente {
  id: string;
  nombre: string;
  fecha: string | null;
  estado: string;
}

export async function getVencimientosPendientesCliente(clienteId: string): Promise<VencimientoPendiente[]> {
  const response = await notion.databases.query({
    database_id: process.env.NOTION_VENCIMIENTOS_DB!,
    filter: {
      and: [
        { property: 'Cliente', relation: { contains: clienteId } },
        {
          or: [
            { property: 'Estado', select: { equals: 'Pendiente' } },
            { property: 'Estado', select: { equals: 'Confirmado' } },
          ],
        },
      ],
    },
    sorts: [{ property: 'Fecha límite', direction: 'ascending' }],
  });

  return response.results.map((page) => {
    const p = page as unknown as {
      id: string;
      properties: {
        'Título': { title: Array<{ plain_text: string }> };
        'Fecha límite': { date: { start: string } | null };
        'Estado': { select: { name: string } | null };
      };
    };
    return {
      id: p.id,
      nombre: p.properties['Título']?.title?.[0]?.plain_text ?? 'Sin nombre',
      fecha: p.properties['Fecha límite']?.date?.start ?? null,
      estado: p.properties['Estado']?.select?.name ?? 'Pendiente',
    };
  });
}

export async function marcarSolicitudDocsEnviada(vencimientoId: string): Promise<void> {
  await notion.pages.update({
    page_id: vencimientoId,
    properties: {
      'Solicitud docs enviada': { checkbox: true },
    },
  });
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
