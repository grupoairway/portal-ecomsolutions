/**
 * Consultas a la base "BD - Informes financieros" de Notion.
 *
 * El modelo de datos y todos los cálculos están en evolucion-tipos.ts, que sí
 * pueden importar los componentes de cliente. Aquí se re-exporta entero para
 * que el servidor tenga un único punto de entrada.
 *
 * Esta base la llena el panel interno (ecom-dashboard) siguiendo el contrato
 * de docs/metricas-json-v2.md. El portal NO escribe nada en ella: solo lee, y
 * solo las filas con "Publicado" marcado.
 *
 * Las propiedades se buscan por varios nombres posibles y todas son
 * opcionales: el panel las va añadiendo y el portal tiene que funcionar igual
 * antes y después. Lo que no exista, sale a null y esa parte no se pinta.
 *
 * "Comentario IA" y "Base PyG" son de uso interno y no se leen nunca.
 */

import { cache } from 'react';
import { Client } from '@notionhq/client';
import {
  componerMes,
  parsePeriodoMensual,
  variacionPct,
  type CuentaDetalle,
  type Informe,
  type Metrica,
  type Pyg,
  type PygMes,
  type TipoCliente,
  type TipoPeriodo,
} from './evolucion-tipos';

export * from './evolucion-tipos';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

type Propiedades = Record<string, unknown>;

/**
 * Texto de una propiedad.
 *
 * Notion parte el texto largo en fragmentos de 2.000 caracteres, así que hay
 * que unirlos todos: quedarse con el primero cortaría el JSON de métricas por
 * la mitad.
 */
function texto(props: Propiedades, ...nombres: string[]): string | null {
  for (const nombre of nombres) {
    const prop = props[nombre] as
      | {
          rich_text?: Array<{ plain_text: string }>;
          title?: Array<{ plain_text: string }>;
          select?: { name: string } | null;
        }
      | undefined;
    if (!prop) continue;

    const valor =
      prop.rich_text?.map((t) => t.plain_text).join('') ??
      prop.title?.map((t) => t.plain_text).join('') ??
      prop.select?.name ??
      null;

    if (valor) return valor;
  }
  return null;
}

/** Fecha de una propiedad date, en YYYY-MM-DD (regla del proyecto). */
function fecha(props: Propiedades, ...nombres: string[]): string | null {
  for (const nombre of nombres) {
    const prop = props[nombre] as { date?: { start: string } | null } | undefined;
    const valor = prop?.date?.start;
    if (valor) return valor.slice(0, 10);
  }
  return null;
}

/**
 * Enlace de una propiedad.
 *
 * Los PDF son URL de Drive, pero se admite también un adjunto de Notion o un
 * texto con la dirección, por si el panel lo guardara de otra forma.
 */
function enlace(props: Propiedades, ...nombres: string[]): string | null {
  for (const nombre of nombres) {
    const prop = props[nombre] as
      | {
          url?: string | null;
          files?: Array<{ file?: { url: string }; external?: { url: string } }>;
          rich_text?: Array<{ plain_text: string; href?: string | null }>;
        }
      | undefined;
    if (!prop) continue;

    const archivo = prop.files?.[0];
    const valor =
      prop.url ??
      archivo?.external?.url ??
      archivo?.file?.url ??
      prop.rich_text?.[0]?.href ??
      prop.rich_text?.map((t) => t.plain_text).join('').trim() ??
      null;

    if (valor && /^https?:\/\//i.test(valor)) return valor;
  }
  return null;
}

function json(props: Propiedades, ...nombres: string[]): unknown {
  const bruto = texto(props, ...nombres);
  if (!bruto) return null;
  try {
    return JSON.parse(bruto);
  } catch {
    // Un JSON roto deja el informe sin esa parte, no tumba la página.
    return null;
  }
}

function numero(valor: unknown): number | null {
  return typeof valor === 'number' && isFinite(valor) ? valor : null;
}

function objeto(valor: unknown): Record<string, unknown> | null {
  return valor && typeof valor === 'object' && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : null;
}

/* -------------------------------------------------------------------------
 * Métricas v2
 * ---------------------------------------------------------------------- */

function metricaV2(valor: unknown): Metrica | null {
  const obj = objeto(valor);
  const actual = numero(obj?.actual);
  if (obj === null || actual === null) return null;

  return {
    actual,
    anioAnterior: numero(obj.anioAnterior),
    varPct: numero(obj.varPct),
    found: obj.found !== false,
    derivado: obj.derivado === true,
  };
}

/**
 * La PyG de un bloque.
 *
 * `resultadoExplotacion` y `otrosIngresosExplotacion` solo se leen en
 * sociedad: el contrato manda discriminar por `tipoCliente`, no por qué
 * claves vengan en el JSON.
 */
function pygV2(valor: unknown, tipoCliente: TipoCliente): Pyg | null {
  const obj = objeto(valor);
  if (!obj) return null;

  const ingresos = metricaV2(obj.ingresos);
  const gastos = metricaV2(obj.gastos);
  const resultado = metricaV2(obj.resultado);
  if (!ingresos || !gastos || !resultado) return null;

  const pyg: Pyg = { ingresos, gastos, resultado };

  if (tipoCliente === 'sociedad') {
    const explotacion = metricaV2(obj.resultadoExplotacion);
    const otros = metricaV2(obj.otrosIngresosExplotacion);
    if (explotacion) pyg.resultadoExplotacion = explotacion;
    if (otros) pyg.otrosIngresosExplotacion = otros;
  }

  return pyg;
}

/**
 * `pygMes` viene plano: las claves de la PyG al mismo nivel que `disponible`.
 * Aquí se separan para que la pantalla no tenga que mirar `disponible` antes
 * de tocar cada cifra.
 */
function pygMesV2(valor: unknown, tipoCliente: TipoCliente): PygMes | null {
  const obj = objeto(valor);
  if (!obj) return null;

  const disponible = obj.disponible === true;
  const base = objeto(obj.baseAnterior);

  return {
    disponible,
    motivo: (obj.motivo as PygMes['motivo']) ?? null,
    baseAnterior: base
      ? {
          periodo: String(base.periodo ?? ''),
          informeId: typeof base.informeId === 'string' ? base.informeId : null,
        }
      : null,
    cifras: disponible ? pygV2(obj, tipoCliente) : null,
  };
}

function tipoPeriodoValido(valor: unknown): TipoPeriodo | null {
  return valor === 'Mensual' || valor === 'Trimestral' || valor === 'Anual'
    ? valor
    : null;
}

function cuentasDetalle(valor: unknown): CuentaDetalle[] {
  if (!Array.isArray(valor)) return [];

  return valor.flatMap((fila) => {
    const obj = objeto(fila);
    const actual = numero(obj?.actual);
    const anioAnterior = numero(obj?.anioAnterior);
    if (!obj || actual === null) return [];

    return [
      {
        epigrafe: String(obj.epigrafe ?? ''),
        epigrafeDesc: String(obj.epigrafeDesc ?? ''),
        cuenta: String(obj.cuenta ?? ''),
        desc: String(obj.desc ?? ''),
        actual,
        anioAnterior: anioAnterior ?? 0,
      },
    ];
  });
}

/* -------------------------------------------------------------------------
 * Métricas v1 (informes antiguos)
 * ---------------------------------------------------------------------- */

/**
 * Una cifra de un informe v1: `{ actual, anterior, porcentaje }`.
 *
 * El `porcentaje` de v1 se descarta entero y se recalcula con la regla del
 * contrato: v1 lo calculaba también sobre bases negativas, donde no significa
 * nada. `signo: -1` pasa a positivo los gastos, que v1 guardaba en negativo.
 */
function metricaV1(valor: unknown, signo: 1 | -1 = 1): Metrica | null {
  const obj = objeto(valor);
  const bruto = numero(obj?.actual);
  if (obj === null || bruto === null) return null;

  const anterior = numero(obj.anterior);
  const actual = bruto * signo;
  const base = anterior === null ? null : anterior * signo;

  return {
    actual,
    anioAnterior: base,
    varPct: variacionPct(actual, base),
    found: true,
    derivado: signo === -1,
  };
}

/**
 * La PyG de un informe v1, traducida al modelo actual.
 *
 * En v1 los gastos venían separados y en negativo; v2 los agrega en positivo.
 * Es lo único que se rescata: sin `version: 2` no hay cifra del mes ni cuentas
 * de detalle, así que la pantalla enseña solo el acumulado.
 */
function pygV1(valor: unknown): Pyg | null {
  const obj = objeto(valor);
  if (!obj) return null;

  const ingresos = metricaV1(obj.ingresos);
  const resultado = metricaV1(obj.resultadoEjercicio) ?? metricaV1(obj.resultadoExplotacion);
  if (!ingresos || !resultado) return null;

  const personal = metricaV1(obj.gastosPersonal, -1);
  const otros = metricaV1(obj.otrosGastos, -1);

  return {
    ingresos,
    gastos: sumar(personal, otros),
    resultado,
  };
}

/** Suma dos partidas de gasto de v1 conservando lo que se sepa del año anterior. */
function sumar(a: Metrica | null, b: Metrica | null): Metrica {
  if (!a && !b) return { actual: 0, anioAnterior: null, varPct: null, found: false, derivado: true };
  if (!a) return b!;
  if (!b) return a;

  const anioAnterior =
    a.anioAnterior === null && b.anioAnterior === null
      ? null
      : (a.anioAnterior ?? 0) + (b.anioAnterior ?? 0);

  const actual = Math.round((a.actual + b.actual) * 100) / 100;
  const base = anioAnterior === null ? null : Math.round(anioAnterior * 100) / 100;

  return {
    actual,
    anioAnterior: base,
    varPct: variacionPct(actual, base),
    found: true,
    derivado: true,
  };
}

/* -------------------------------------------------------------------------
 * De una fila de Notion a un informe
 * ---------------------------------------------------------------------- */

/** Una fila de Notion, ya en el modelo del portal. */
export function informeDesdePagina(page: unknown): Informe {
  const p = page as { id: string; properties: Propiedades };
  const props = p.properties;

  const periodoNotion = texto(props, 'Período', 'Periodo') ?? '';
  const comun = {
    id: p.id,
    periodo: periodoNotion,
    fecha:
      fecha(props, 'Fecha publicación', 'Fecha publicacion') ??
      fecha(props, 'Fecha subida'),
    comentarioGestor: texto(props, 'Comentario gestor', 'Comentario del gestor'),
    balancePdf: enlace(props, 'Balance PDF'),
    pygPdf: enlace(props, 'PyG PDF', 'PYG PDF'),
  };

  const metricas = objeto(
    json(props, 'Métricas JSON', 'Metricas JSON', 'MétricasJSON', 'MetricasJSON'),
  );

  // Un consumidor debe comprobar la versión y no dar por bueno lo que no
  // entiende: cualquier cosa que no sea v2 se trata como informe antiguo.
  if (!metricas || metricas.version !== 2) {
    const pyg = objeto(metricas?.pyg);
    const balance = objeto(metricas?.balance);
    const mes = parsePeriodoMensual(periodoNotion);

    return {
      ...comun,
      version: 1,
      tipoCliente: null,
      tipoPeriodo:
        tipoPeriodoValido(texto(props, 'Tipo período', 'Tipo periodo', 'Tipo')) ??
        (mes ? 'Mensual' : null),
      mes,
      ejercicio: mes ? Number(mes.slice(0, 4)) : null,
      // v1 no guardaba el año de la columna de comparación, pero era siempre
      // el ejercicio anterior. Las cifras que no traigan comparación se
      // quedan igual sin ella.
      ejercicioAnterior: mes ? Number(mes.slice(0, 4)) - 1 : null,
      caja: balance ? metricaV1(balance.caja) : null,
      pygYtd: pyg ? pygV1(pyg) : null,
      pygMes: null,
      cuentas: [],
    };
  }

  const tipoCliente: TipoCliente =
    metricas.tipoCliente === 'autonomo' ? 'autonomo' : 'sociedad';
  const periodo = objeto(metricas.periodo);
  const tipoPeriodo =
    tipoPeriodoValido(periodo?.tipo) ??
    tipoPeriodoValido(texto(props, 'Tipo período', 'Tipo periodo')) ??
    null;
  const ejercicio = numero(periodo?.ejercicio);
  const mesNumero = numero(periodo?.mes);
  const balance = objeto(metricas.balance);

  return {
    ...comun,
    // La etiqueta del JSON y la propiedad de Notion son la misma cosa; si el
    // panel las desincroniza, mandan las métricas, que son las de las cifras.
    periodo: (periodo?.etiqueta as string) || periodoNotion,
    version: 2,
    tipoCliente,
    tipoPeriodo,
    mes:
      tipoPeriodo === 'Anual'
        ? null
        : (componerMes(ejercicio, mesNumero) ?? parsePeriodoMensual(periodoNotion)),
    ejercicio,
    ejercicioAnterior: numero(periodo?.ejercicioAnterior),
    // El balance es null en autónomo, y del balance solo se usa la caja.
    caja: tipoCliente === 'sociedad' && balance ? metricaV2(balance.caja) : null,
    pygYtd: pygV2(metricas.pygYtd, tipoCliente),
    pygMes: pygMesV2(metricas.pygMes, tipoCliente),
    cuentas: cuentasDetalle(json(props, 'PyG JSON', 'PyGJSON', 'PYG JSON')),
  };
}

/**
 * Los informes publicados del cliente, del más reciente al más antiguo.
 *
 * No se ordena en la consulta: "Fecha publicación" puede no existir todavía en
 * la base y pedirle a Notion que ordene por una propiedad ausente devuelve un
 * error. Se ordena aquí.
 *
 * Va envuelto en cache() como el resto: si la pantalla lo pide dos veces en la
 * misma petición, Notion se consulta una sola vez.
 */
export const getInformesPublicados = cache(async function getInformesPublicados(
  clienteId: string,
): Promise<Informe[]> {
  const resultados: unknown[] = [];
  let cursor: string | undefined;

  do {
    const res = await notion.databases.query({
      database_id: process.env.NOTION_INFORMES_DB!,
      filter: {
        and: [
          { property: 'Cliente', relation: { contains: clienteId } },
          { property: 'Publicado', checkbox: { equals: true } },
        ],
      },
      start_cursor: cursor,
      page_size: 100,
    });
    resultados.push(...res.results);
    cursor = res.next_cursor ?? undefined;
  } while (cursor);

  return resultados.map(informeDesdePagina).sort(masRecientePrimero);
});

/**
 * Orden de la lista: por el período al que se refiere el informe y, cuando no
 * es mensual, por la fecha de publicación. Los dos criterios se comparan como
 * texto (YYYY-MM y YYYY-MM-DD), nunca construyendo un Date.
 */
function masRecientePrimero(a: Informe, b: Informe): number {
  return (
    (b.mes ?? b.fecha ?? '').localeCompare(a.mes ?? a.fecha ?? '') ||
    (b.fecha ?? '').localeCompare(a.fecha ?? '')
  );
}
