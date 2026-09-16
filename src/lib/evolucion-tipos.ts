/**
 * Modelo de datos de "Mi evolución" y todos sus cálculos.
 *
 * Las cifras vienen de la base "BD - Informes financieros" de Notion, que
 * llena el panel interno (ecom-dashboard). El contrato está en
 * docs/metricas-json-v2.md, con copia en los dos repositorios; la fuente de
 * verdad de los tipos es lib/quantum/tipos.ts del panel.
 *
 * Tres reglas del contrato que mandan sobre todo lo que hay aquí:
 *
 *   1. La PyG de Quantum es acumulada desde enero. La cifra del mes aislado la
 *      calcula el panel en `pygMes`; el portal NO resta acumulados. Si
 *      `pygMes.disponible` es false, se enseña solo el acumulado y el motivo.
 *   2. Se discrimina siempre por `tipoCliente`, nunca por qué claves existan.
 *   3. `varPct` viene calculado y es null cuando la base es null, 0 o negativa.
 *      Si es null no se pinta porcentaje: un porcentaje sobre base negativa no
 *      significa nada.
 *
 * Módulo puro: no habla con Notion, así que puede importarse también desde
 * componentes de cliente. Las consultas están en evolucion.ts.
 *
 * Un "mes" aquí es siempre "YYYY-MM", y se compone a partir de `periodo.mes` y
 * `periodo.ejercicio`, nunca construyendo un Date.
 */

import { euros } from './fechas';

export type TipoCliente = 'sociedad' | 'autonomo';
export type TipoPeriodo = 'Mensual' | 'Trimestral' | 'Anual';
export type MotivoSinMes = 'sin-informe-anterior' | 'enero' | 'periodo-anual';

/** Una cifra del informe. Importes a 2 decimales y gastos en positivo. */
export interface Metrica {
  actual: number;
  /** Mismo período del ejercicio anterior. null si el export no lo trae. */
  anioAnterior: number | null;
  /** Ya calculado por el panel; null si no se puede expresar. */
  varPct: number | null;
  /** La fila existe en el Excel. Si es false, ese concepto no se pinta. */
  found: boolean;
  derivado: boolean;
}

/**
 * Cuenta de pérdidas y ganancias.
 *
 * `resultadoExplotacion` y `otrosIngresosExplotacion` solo existen en
 * sociedad, pero quien decide qué pintar es `tipoCliente`, no la presencia de
 * la clave.
 */
export interface Pyg {
  ingresos: Metrica;
  gastos: Metrica;
  resultado: Metrica;
  otrosIngresosExplotacion?: Metrica;
  resultadoExplotacion?: Metrica;
}

/** Las cifras del período aislado, tal y como las deriva el panel. */
export interface PygMes {
  disponible: boolean;
  motivo: MotivoSinMes | null;
  /** De qué informe se ha restado el acumulado. */
  baseAnterior: { periodo: string; informeId: string | null } | null;
  /** null cuando `disponible` es false. */
  cifras: Pyg | null;
}

/**
 * Una cuenta de detalle de "PyG JSON". Son cifras acumuladas (YTD) y
 * conservan el signo del Excel: los gastos vienen en negativo.
 */
export interface CuentaDetalle {
  epigrafe: string;
  epigrafeDesc: string;
  cuenta: string;
  desc: string;
  actual: number;
  anioAnterior: number;
}

export interface Informe {
  id: string;
  /** 2 = contrato v2. 1 = informe antiguo, que solo sirve para el acumulado. */
  version: 1 | 2;
  /** null en los informes v1: no traían el dato. */
  tipoCliente: TipoCliente | null;
  /** Tal y como está en Notion: "Julio 2026", "Anual 2025". */
  periodo: string;
  tipoPeriodo: TipoPeriodo | null;
  /** "2026-07"; null en trimestrales y anuales. */
  mes: string | null;
  ejercicio: number | null;
  ejercicioAnterior: number | null;
  /** Fecha de publicación, o la de subida si el panel aún no la pone. */
  fecha: string | null;
  comentarioGestor: string | null;
  balancePdf: string | null;
  pygPdf: string | null;
  /**
   * Del balance solo se guarda la caja: el resto de la contabilidad es de
   * Quantum y el portal no la duplica. null en autónomo.
   */
  caja: Metrica | null;
  pygYtd: Pyg | null;
  /** null si el período es anual o el informe es v1. */
  pygMes: PygMes | null;
  cuentas: CuentaDetalle[];
}

/* -------------------------------------------------------------------------
 * Meses
 * ---------------------------------------------------------------------- */

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const MESES_CORTOS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

/** Quita tildes y pasa a minúsculas, para comparar nombres de mes. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

const MESES_SIN_TILDE = MESES.map(normalizar);

/** "2026-07" a partir del mes (1-12) y el ejercicio del informe. */
export function componerMes(
  ejercicio: number | null,
  mes: number | null,
): string | null {
  if (!ejercicio || !mes || mes < 1 || mes > 12) return null;
  return `${ejercicio}-${String(mes).padStart(2, '0')}`;
}

/**
 * "Julio 2026" -> "2026-07". Respaldo para los informes v1, que no traen
 * `periodo.mes`. Devuelve null si el período no es un mes: "Anual 2025",
 * "3T 2026" o cualquier cosa que no se reconozca.
 */
export function parsePeriodoMensual(periodo: string | null): string | null {
  if (!periodo) return null;

  const iso = periodo.trim().match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (iso) return `${iso[1]}-${iso[2]}`;

  const conAnio = normalizar(periodo).match(/^([a-z]+)\s+(?:de\s+)?(\d{4})$/);
  if (!conAnio) return null;

  const indice = MESES_SIN_TILDE.indexOf(conAnio[1]);
  if (indice === -1) return null;

  return `${conAnio[2]}-${String(indice + 1).padStart(2, '0')}`;
}

/** "2026-07" -> "Julio 2026". */
export function nombreMes(mes: string): string {
  const nombre = MESES[numeroMes(mes) - 1];
  if (!nombre) return mes;
  return `${nombre[0].toUpperCase()}${nombre.slice(1)} ${mes.slice(0, 4)}`;
}

/** "2026-07" -> "julio", para meterlo dentro de una frase. */
export function mesEnFrase(mes: string): string {
  return MESES[numeroMes(mes) - 1] ?? mes;
}

/** "2026-07" -> "jul"; en enero se añade el año para orientarse en la gráfica. */
export function mesCorto(mes: string): string {
  const n = numeroMes(mes);
  const corto = MESES_CORTOS[n - 1] ?? mes;
  return n === 1 ? `${corto} ${mes.slice(2, 4)}` : corto;
}

function numeroMes(mes: string): number {
  return Number(mes.slice(5, 7));
}

/** "2026-07" -> "2026-06". */
export function mesAnterior(mes: string): string {
  const anio = Number(mes.slice(0, 4));
  const n = numeroMes(mes);
  return n === 1
    ? `${anio - 1}-12`
    : `${anio}-${String(n - 1).padStart(2, '0')}`;
}

/* -------------------------------------------------------------------------
 * Cálculos sobre las cifras
 * ---------------------------------------------------------------------- */

/**
 * Variación porcentual con la misma regla que el panel: solo tiene sentido
 * sobre una base positiva.
 */
export function variacionPct(actual: number, base: number | null): number | null {
  if (base === null || base <= 0) return null;
  return Math.round(((actual - base) / base) * 10000) / 100;
}

/** Margen en porcentaje: resultado sobre ingresos. null si no hay ingresos. */
export function margen(pyg: Pyg | null): number | null {
  if (!pyg || pyg.ingresos.actual <= 0) return null;
  return Math.round((pyg.resultado.actual / pyg.ingresos.actual) * 10000) / 100;
}

/** El margen del mismo período del ejercicio anterior, si se puede calcular. */
export function margenAnioAnterior(pyg: Pyg | null): number | null {
  const ingresos = pyg?.ingresos.anioAnterior;
  const resultado = pyg?.resultado.anioAnterior;
  if (!pyg || ingresos == null || resultado == null || ingresos <= 0) return null;
  return Math.round((resultado / ingresos) * 10000) / 100;
}

/* -------------------------------------------------------------------------
 * Bloques de la pantalla
 * ---------------------------------------------------------------------- */

/** Una comparación de una cifra contra otra. */
export interface Comparacion {
  /** "junio", "julio de 2025", "el mismo tramo de 2025". */
  referencia: string;
  valor: number | null;
  /** null cuando no se puede expresar en porcentaje; entonces no se pinta. */
  pct: number | null;
  /** Diferencia en puntos. Solo para el margen, que ya es un porcentaje. */
  puntos: number | null;
}

export interface Cifra {
  etiqueta: string;
  valor: number | null;
  formato: 'euros' | 'porcentaje';
  /** En los gastos, subir es malo: el color del indicador se invierte. */
  mejorSiSube: boolean;
  mesAnterior: Comparacion | null;
  anioAnterior: Comparacion | null;
}

export type BloqueMes =
  | { disponible: true; titulo: string; cifras: Cifra[]; nota: string | null }
  | { disponible: false; explicacion: string };

export interface BloqueAcumulado {
  titulo: string;
  cifras: Cifra[];
  /** Caja a cierre del período. Solo sociedad. */
  caja: { valor: number; etiqueta: string } | null;
  /** El export no trae ejercicio anterior: no hay con qué comparar. */
  sinAnioAnterior: boolean;
}

function comparacionAnioAnterior(
  m: Metrica,
  referencia: string,
): Comparacion | null {
  if (m.anioAnterior === null) return null;
  return { referencia, valor: m.anioAnterior, pct: m.varPct, puntos: null };
}

function comparacionMesAnterior(
  actual: Metrica,
  anterior: Metrica | undefined,
  referencia: string,
): Comparacion | null {
  if (!anterior || !anterior.found) return null;
  return {
    referencia,
    valor: anterior.actual,
    pct: variacionPct(actual.actual, anterior.actual),
    puntos: null,
  };
}

function cifraDeMetrica(
  etiqueta: string,
  m: Metrica,
  opciones: {
    mejorSiSube: boolean;
    anioAnterior: string | null;
    mesAnterior?: { metrica: Metrica | undefined; referencia: string };
  },
): Cifra | null {
  // found: false significa que ese concepto no existe en el Excel del cliente.
  if (!m.found) return null;

  return {
    etiqueta,
    valor: m.actual,
    formato: 'euros',
    mejorSiSube: opciones.mejorSiSube,
    mesAnterior: opciones.mesAnterior
      ? comparacionMesAnterior(
          m,
          opciones.mesAnterior.metrica,
          opciones.mesAnterior.referencia,
        )
      : null,
    anioAnterior: opciones.anioAnterior
      ? comparacionAnioAnterior(m, opciones.anioAnterior)
      : null,
  };
}

function cifraMargen(
  pyg: Pyg,
  opciones: {
    anioAnterior: string | null;
    mesAnterior?: { pyg: Pyg | null; referencia: string };
  },
): Cifra | null {
  const valor = margen(pyg);
  if (valor === null) return null;

  // El margen ya es un porcentaje: su variación se expresa en puntos, nunca
  // como porcentaje de un porcentaje.
  const enPuntos = (otro: number | null, referencia: string): Comparacion | null =>
    otro === null
      ? null
      : {
          referencia,
          valor: otro,
          pct: null,
          puntos: Math.round((valor - otro) * 10) / 10,
        };

  const previo = opciones.mesAnterior?.pyg
    ? margen(opciones.mesAnterior.pyg)
    : null;

  return {
    etiqueta: 'Margen',
    valor,
    formato: 'porcentaje',
    mejorSiSube: true,
    mesAnterior: opciones.mesAnterior
      ? enPuntos(previo, opciones.mesAnterior.referencia)
      : null,
    anioAnterior: opciones.anioAnterior
      ? enPuntos(margenAnioAnterior(pyg), opciones.anioAnterior)
      : null,
  };
}

/** Cómo se nombra un período en una frase: "junio", "3T 2026". */
function nombrePeriodo(informe: Informe): string {
  return informe.tipoPeriodo === 'Mensual' && informe.mes
    ? mesEnFrase(informe.mes)
    : informe.periodo;
}

/** "julio de 2025", la referencia del mismo período del ejercicio anterior. */
function referenciaAnioAnterior(informe: Informe): string | null {
  if (informe.ejercicioAnterior === null) return null;
  return informe.mes
    ? `${mesEnFrase(informe.mes)} de ${informe.ejercicioAnterior}`
    : `${informe.ejercicioAnterior}`;
}

/**
 * Las cifras del mes aislado.
 *
 * `anterior` es el informe del período anterior, y solo se usa para comparar
 * dos `pygMes` que ya ha calculado el panel: aquí no se restan acumulados.
 */
export function cifrasDelMes(
  informe: Informe,
  anterior: Informe | null,
): BloqueMes {
  if (informe.version === 1) {
    return {
      disponible: false,
      explicacion:
        'Estamos actualizando este informe. De momento te mostramos el acumulado del año.',
    };
  }

  if (informe.pygMes === null) {
    return {
      disponible: false,
      explicacion:
        'Es un informe anual, así que solo hay cifras acumuladas del ejercicio.',
    };
  }

  if (!informe.pygMes.disponible || !informe.pygMes.cifras) {
    const base = informe.pygMes.baseAnterior?.periodo;
    return {
      disponible: false,
      explicacion:
        'Todavía no podemos separar las cifras de este período: nos falta el informe ' +
        `${base ? `de ${base.toLowerCase()}` : 'del período anterior'}. Te mostramos el acumulado del año.`,
    };
  }

  const cifras = informe.pygMes.cifras;
  const previo =
    anterior?.pygMes?.disponible && anterior.pygMes.cifras
      ? anterior.pygMes.cifras
      : null;
  // En un informe trimestral el período no es un mes, así que se nombra por su
  // etiqueta ("3T 2026") en vez de por el mes de cierre.
  const referenciaMes = anterior ? nombrePeriodo(anterior) : null;
  const vsMes = previo && referenciaMes ? { referencia: referenciaMes } : null;
  const vsAnio = referenciaAnioAnterior(informe);

  const lista = [
    cifraDeMetrica('Ingresos', cifras.ingresos, {
      mejorSiSube: true,
      anioAnterior: vsAnio,
      mesAnterior: vsMes
        ? { metrica: previo?.ingresos, referencia: vsMes.referencia }
        : undefined,
    }),
    cifraDeMetrica('Gastos', cifras.gastos, {
      mejorSiSube: false,
      anioAnterior: vsAnio,
      mesAnterior: vsMes
        ? { metrica: previo?.gastos, referencia: vsMes.referencia }
        : undefined,
    }),
    cifraDeMetrica('Resultado', cifras.resultado, {
      mejorSiSube: true,
      anioAnterior: vsAnio,
      mesAnterior: vsMes
        ? { metrica: previo?.resultado, referencia: vsMes.referencia }
        : undefined,
    }),
    cifraMargen(cifras, {
      anioAnterior: vsAnio,
      mesAnterior: vsMes ? { pyg: previo, referencia: vsMes.referencia } : undefined,
    }),
  ].filter((c): c is Cifra => c !== null);

  return {
    disponible: true,
    titulo:
      informe.tipoPeriodo === 'Mensual' && informe.mes
        ? nombreMes(informe.mes)
        : informe.periodo,
    cifras: lista,
    nota:
      informe.pygMes.motivo === 'enero'
        ? 'En enero el acumulado del año es justo el mes.'
        : null,
  };
}

/** Las cifras acumuladas del ejercicio, contra el mismo tramo del año anterior. */
export function cifrasAcumulado(informe: Informe): BloqueAcumulado | null {
  const ytd = informe.pygYtd;
  if (!ytd) return null;

  const vsAnio =
    informe.ejercicioAnterior !== null
      ? `el mismo tramo de ${informe.ejercicioAnterior}`
      : null;

  const cifras = [
    cifraDeMetrica('Ingresos', ytd.ingresos, { mejorSiSube: true, anioAnterior: vsAnio }),
    cifraDeMetrica('Gastos', ytd.gastos, { mejorSiSube: false, anioAnterior: vsAnio }),
    cifraDeMetrica('Resultado', ytd.resultado, { mejorSiSube: true, anioAnterior: vsAnio }),
    cifraMargen(ytd, { anioAnterior: vsAnio }),
  ].filter((c): c is Cifra => c !== null);

  return {
    titulo: tituloAcumulado(informe),
    cifras,
    caja:
      informe.caja && informe.caja.found
        ? {
            valor: informe.caja.actual,
            etiqueta: informe.mes
              ? `Caja a cierre de ${mesEnFrase(informe.mes)}`
              : 'Caja a cierre del ejercicio',
          }
        : null,
    // No basta con que el informe diga qué ejercicio es el anterior: el export
    // del autónomo trae el año pero ninguna cifra con la que comparar.
    sinAnioAnterior: cifras.every((c) => c.anioAnterior === null),
  };
}

function tituloAcumulado(informe: Informe): string {
  const ejercicio = informe.ejercicio ?? '';
  if (!informe.mes) return `Ejercicio ${ejercicio}`;
  const hasta = mesEnFrase(informe.mes);
  if (hasta === 'enero') return `Acumulado de ${ejercicio}: enero`;
  return `Acumulado de ${ejercicio}, de enero a ${hasta}`;
}

/* -------------------------------------------------------------------------
 * Series de las gráficas
 * ---------------------------------------------------------------------- */

export interface PuntoBarras {
  mes: string;
  etiqueta: string;
  /** null = ese mes no tiene informe publicado; queda como hueco. */
  ingresos: number | null;
  gastos: number | null;
}

export interface PuntoLinea {
  mes: string;
  etiqueta: string;
  esteAnio: number | null;
  anioAnterior: number | null;
}

/** Los informes mensuales publicados, del más reciente al más antiguo. */
export function informesMensuales(informes: Informe[]): Informe[] {
  return informes
    .filter((i) => i.mes !== null && i.tipoPeriodo !== 'Anual')
    .sort((a, b) => b.mes!.localeCompare(a.mes!));
}

/**
 * Ingresos y gastos del mes, de los últimos `meses` meses.
 *
 * Los meses sin informe publicado, o con el mes sin derivar, se devuelven a
 * null y la gráfica los deja como hueco: un mes sin informe no es un mes a
 * cero.
 */
export function serieBarras(informes: Informe[], meses = 12): PuntoBarras[] {
  const mensuales = informesMensuales(informes);
  const ultimo = mensuales[0]?.mes;
  if (!ultimo) return [];

  const porMes = new Map(mensuales.map((i) => [i.mes!, i]));
  const puntos: PuntoBarras[] = [];

  let mes = ultimo;
  for (let i = 0; i < meses; i++) {
    const cifras = porMes.get(mes)?.pygMes?.cifras ?? null;
    puntos.unshift({
      mes,
      etiqueta: mesCorto(mes),
      ingresos: cifras?.ingresos.found ? cifras.ingresos.actual : null,
      gastos: cifras?.gastos.found ? cifras.gastos.actual : null,
    });
    mes = mesAnterior(mes);
  }

  return puntos;
}

/**
 * Resultado acumulado del ejercicio en curso, contra el mismo tramo del
 * anterior.
 *
 * Las dos series salen del mismo informe (`actual` y `anioAnterior` de
 * `pygYtd.resultado`), así que no hace falta tener publicados los informes del
 * ejercicio pasado.
 */
export function serieAcumulado(informes: Informe[]): PuntoLinea[] {
  const mensuales = informesMensuales(informes);
  const ejercicio = mensuales[0]?.ejercicio;
  if (!ejercicio) return [];

  return mensuales
    .filter((i) => i.ejercicio === ejercicio && i.pygYtd)
    .sort((a, b) => a.mes!.localeCompare(b.mes!))
    .map((i) => ({
      mes: i.mes!,
      etiqueta: mesCorto(i.mes!),
      esteAnio: i.pygYtd!.resultado.found ? i.pygYtd!.resultado.actual : null,
      anioAnterior: i.pygYtd!.resultado.anioAnterior,
    }));
}

/* -------------------------------------------------------------------------
 * Avisos automáticos
 * ---------------------------------------------------------------------- */

/** Subida de gastos que merece un aviso, en porcentaje sobre el mes anterior. */
const SUBIDA_GASTOS = 20;
/** Caída de margen por debajo de esto es ruido, no un aviso. */
const CAIDA_MARGEN_PUNTOS = 0.5;
/** Meses seguidos de bajada de ingresos que disparan el aviso. */
const MESES_A_LA_BAJA = 3;
/** Una partida avisa si sube al menos esto, en porcentaje y en euros. */
const PARTIDA_PCT = 25;
const PARTIDA_EUROS = 300;
const MAX_PARTIDAS = 2;

export interface Alerta {
  tono: 'warn' | 'alert';
  texto: string;
}

function porcentaje(n: number, decimales = 1): string {
  return `${n.toLocaleString('es-ES', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })} %`;
}

/**
 * Los avisos de la pantalla.
 *
 * Se calculan aquí, con la serie de `pygMes` que ya ha derivado el panel y con
 * las cuentas de detalle. Los `avisos` que trae el propio JSON
 * (sin-ejercicio-anterior, descuadre-epigrafes...) son para el gestor y no se
 * enseñan nunca al cliente.
 */
export function alertas(informes: Informe[]): Alerta[] {
  const mensuales = informesMensuales(informes);
  const ultimo = mensuales[0];
  if (!ultimo || ultimo.version === 1) return [];

  const salida: Alerta[] = [];
  const cifras = ultimo.pygMes?.disponible ? ultimo.pygMes.cifras : null;
  const previo = mensuales[1];
  const cifrasPrevio = previo?.pygMes?.disponible ? previo.pygMes.cifras : null;
  const esConsecutivo =
    previo?.mes != null && ultimo.mes != null && previo.mes === mesAnterior(ultimo.mes);

  if (cifras && cifrasPrevio && esConsecutivo && ultimo.mes && previo.mes) {
    const mesActual = mesEnFrase(ultimo.mes);
    const mesPrevio = mesEnFrase(previo.mes);

    // 1. Gastos disparados respecto al mes anterior.
    const subida = variacionPct(cifras.gastos.actual, cifrasPrevio.gastos.actual);
    if (subida !== null && subida >= SUBIDA_GASTOS) {
      salida.push({
        tono: 'warn',
        texto:
          `Tus gastos de ${mesActual} (${euros(cifras.gastos.actual)}) han subido ` +
          `un ${porcentaje(subida, 0)} respecto a ${mesPrevio}.`,
      });
    }

    // 2. Margen a la baja.
    const margenActual = margen(cifras);
    const margenPrevio = margen(cifrasPrevio);
    if (
      margenActual !== null &&
      margenPrevio !== null &&
      margenPrevio - margenActual >= CAIDA_MARGEN_PUNTOS
    ) {
      salida.push({
        tono: 'warn',
        texto:
          `Tu margen ha bajado del ${porcentaje(margenPrevio)} al ` +
          `${porcentaje(margenActual)} respecto a ${mesPrevio}.`,
      });
    }
  }

  // 3. Ingresos bajando varios meses seguidos.
  const racha = rachaDeBajada(mensuales);
  if (racha.length >= MESES_A_LA_BAJA) {
    const nombres = racha.map(mesEnFrase);
    salida.push({
      tono: 'alert',
      texto:
        `Tus ingresos llevan ${racha.length} meses bajando: ` +
        `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}.`,
    });
  }

  salida.push(...alertasPorPartida(ultimo));

  return salida;
}

/**
 * Meses seguidos en los que los ingresos del mes han bajado, del más antiguo
 * al más reciente. Un hueco en la serie corta la racha: no se compara contra
 * un mes que no tenemos.
 */
function rachaDeBajada(mensuales: Informe[]): string[] {
  const racha: string[] = [];

  for (let i = 0; i < mensuales.length - 1; i++) {
    const actual = mensuales[i];
    const previo = mensuales[i + 1];
    if (!actual.mes || !previo.mes || previo.mes !== mesAnterior(actual.mes)) break;

    const a = actual.pygMes?.disponible ? actual.pygMes.cifras : null;
    const b = previo.pygMes?.disponible ? previo.pygMes.cifras : null;
    if (!a || !b || !a.ingresos.found || !b.ingresos.found) break;
    if (a.ingresos.actual >= b.ingresos.actual) break;

    racha.unshift(actual.mes);
  }

  return racha;
}

/**
 * Partidas de gasto que se han disparado respecto al año pasado.
 *
 * Las cuentas de detalle son acumuladas, así que la comparación honesta es
 * contra el mismo tramo del ejercicio anterior, que viene en la misma fila.
 * Los gastos llegan en negativo, con el signo del Excel.
 */
function alertasPorPartida(informe: Informe): Alerta[] {
  const gastos = informe.cuentas.filter(
    (c) => c.actual < 0 || c.anioAnterior < 0,
  );

  return gastos
    .map((c) => {
      const actual = Math.abs(c.actual);
      const anterior = Math.abs(c.anioAnterior);
      const pct = variacionPct(actual, anterior || null);
      return { cuenta: c, actual, anterior, pct, subida: actual - anterior };
    })
    .filter((g) => g.pct !== null && g.pct >= PARTIDA_PCT && g.subida >= PARTIDA_EUROS)
    .sort((a, b) => b.subida - a.subida)
    .slice(0, MAX_PARTIDAS)
    .map((g) => ({
      tono: 'warn' as const,
      texto:
        `En lo que va de año llevas un ${porcentaje(g.pct!, 0)} más en ` +
        `${enFrase(g.cuenta.desc)} que el año pasado: ${euros(g.actual)} ` +
        `frente a ${euros(g.anterior)}.`,
    }));
}

/** Los conceptos de Quantum vienen en mayúsculas; en mitad de una frase chirrían. */
function enFrase(texto: string): string {
  return texto.trim().toLowerCase();
}
