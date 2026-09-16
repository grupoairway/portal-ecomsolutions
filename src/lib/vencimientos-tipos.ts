/**
 * Modelo de datos de la base "BD - Vencimientos del" de Notion.
 *
 * Un vencimiento es un impuesto concreto de un periodo concreto. Su ciclo de
 * vida son cinco pasos que el cliente ve en el seguimiento del trimestre:
 *
 *   1. Documentacion   -> "Documentación completa" (checkbox)
 *   2. Borrador        -> "Borrador enviado" + "Fecha publicación borrador" + "Borrador URL"
 *   3. Tu conformidad  -> "Conformidad fecha" + "Conformidad por" (plazo: "Plazo conformidad")
 *   4. Presentacion    -> "Fecha presentación real" + "Justificante AEAT" + "Nº referencia presentación"
 *   5. Cargo en cuenta -> "Fecha cargo"   (o "Devolución", si sale a su favor)
 *
 * Este módulo es puro: no habla con Notion, así que puede importarse
 * también desde componentes de cliente. Las consultas están en vencimientos.ts.
 */

import {
  diasEntre,
  euros,
  fechaHoraLarga,
  fechaLarga,
  hoy,
  soloFecha,
  sumarDias,
} from './fechas';
import { mesActual, nombreMes, sumarMeses } from './cierres-tipos';

export type EstadoPaso = 'hecho' | 'ahora' | 'pendiente';

export type ClavePaso =
  | 'documentacion'
  | 'borrador'
  | 'conformidad'
  /** Solo cuando paga el cliente: sin NRC no podemos presentar. */
  | 'pago'
  | 'presentacion'
  | 'cargo'
  /** Solo cuando Hacienda tiene que devolver dinero. */
  | 'devolucion'
  /** Solo cuando el pago se ha pedido a plazos. */
  | 'aplazamiento';

export interface Paso {
  clave: ClavePaso;
  titulo: string;
  detalle: string;
  estado: EstadoPaso;
}

export interface Vencimiento {
  id: string;
  titulo: string;
  /** Número o nombre del modelo tal y como aparece en el título: "303". */
  modelo: string;
  /** Nombre en cristiano: "IVA", "Retenciones de trabajadores"... */
  modeloDescripcion: string;
  periodo: string;
  fechaLimite: string | null;
  /**
   * Fecha en la que hay que presentar de verdad. Coincide con fechaLimite
   * salvo si el pago está domiciliado, que la adelanta al día 15.
   */
  fechaLimitePresentacion: string | null;
  /** El pago está domiciliado, así que se presenta antes del día 15. */
  domiciliado: boolean;
  estado: string;

  documentacionCompleta: boolean;
  borradorEnviado: boolean;
  borradorUrl: string | null;
  fechaPublicacionBorrador: string | null;

  /** Plazo de Notion o, si está vacío, el calculado por defecto. */
  plazoConformidad: string | null;
  /** true cuando el plazo no está en Notion y lo ha calculado el portal. */
  plazoConformidadEstimado: boolean;
  conformidadFecha: string | null;
  conformidadPor: string | null;

  fechaPresentacion: string | null;
  justificanteUrl: string | null;
  referenciaPresentacion: string | null;
  fechaCargo: string | null;

  /* --- Pago con NRC --- */
  /** Carta de pago para que el cliente pague en su banco. */
  cartaPagoUrl: string | null;
  /** Número de referencia completo que devuelve el banco al pagar. */
  nrc: string | null;
  /** Cuándo se pagó, con hora: es prueba ante el cliente. */
  fechaPago: string | null;
  justificantePagoUrl: string | null;
  /** El cliente tiene certificado digital, así que pagamos nosotros. */
  clienteConCertificado: boolean;

  resultado: string | null;
  importe: number | null;
  formaPago: string | null;
  iban: string | null;
  confirmacionCliente: string | null;
  notasCliente: string | null;

  /* --- Aplazamiento del pago --- */
  aplazamientoCuotas: number | null;
  /** Día 1 del mes en que se paga la primera cuota. */
  aplazamientoPrimeraCuota: string | null;
  aplazamientoMotivo: string | null;

  /* --- Datos del cliente que cambian las opciones de cobro --- */
  /** Inscrito en el registro de devolución mensual del IVA. */
  redeme: boolean;
  /** "Periodicidad IVA" = Mensual en su ficha. */
  ivaMensual: boolean;
  /** "Tipo de cliente": decide cuántas cuotas admite un aplazamiento. */
  tipoCliente: string | null;
  /** El modelo sale a favor del cliente: a devolver o a compensar. */
  esNegativo: boolean;

  /** Los cinco pasos del seguimiento, ya resueltos. */
  pasos: Paso[];
  /** Qué pasos están completados. Sirve para agrupar por periodo. */
  progreso: Record<ClavePaso, boolean>;
  /** Hay borrador publicado y el cliente aún no ha dado conformidad. */
  esperaConformidad: boolean;
  /** Ya presentado (o domiciliado). */
  presentado: boolean;
  /**
   * El pago lo tiene que hacer el cliente: forma de pago NRC y sin
   * certificado digital. Con certificado pagamos nosotros por él.
   */
  pagaElCliente: boolean;
  /** Ya consta el pago. */
  pagado: boolean;
  /** Días naturales hasta la fecha límite. Negativo si ya pasó. */
  diasParaLimite: number | null;
}

/** Nombres llanos de los modelos que aparecen en la base. */
const MODELOS: Record<string, string> = {
  '100': 'Renta',
  'D-100': 'Renta',
  '111': 'Retenciones de trabajadores y profesionales',
  '115': 'Retenciones de alquileres',
  '130': 'Pago a cuenta del IRPF',
  '131': 'Pago a cuenta del IRPF (módulos)',
  '180': 'Resumen anual de alquileres',
  '190': 'Resumen anual de retenciones',
  '200': 'Impuesto de Sociedades',
  '202': 'Pago a cuenta del Impuesto de Sociedades',
  '303': 'IVA',
  '347': 'Operaciones con terceros',
  '349': 'Operaciones intracomunitarias',
  '390': 'Resumen anual de IVA',
};

/** Valor de "Forma pago/cobro" que adelanta el plazo de presentación. */
export const FORMA_PAGO_DOMICILIACION = 'Domiciliación';

/** Valor de "Forma pago/cobro" en el que el pago se hace con carta de pago. */
export const FORMA_PAGO_NRC = 'NRC';

/** Resto de opciones del select "Forma pago/cobro" de Notion. */
export const FORMA_PAGO_APLAZAMIENTO = 'Aplazamiento';
export const FORMA_COBRO_DEVOLUCION = 'Devolución en cuenta';
export const FORMA_COBRO_COMPENSAR = 'Compensar próximas';

/** Formas de pago/cobro que necesitan una cuenta bancaria. */
export const REQUIEREN_IBAN: string[] = [
  FORMA_PAGO_DOMICILIACION,
  FORMA_COBRO_DEVOLUCION,
  // Las cuotas del aplazamiento las carga Hacienda en una cuenta.
  FORMA_PAGO_APLAZAMIENTO,
];

/**
 * Modelos que, cuando salen a devolver, solo admiten devolución en cuenta: no
 * hay declaraciones futuras del mismo impuesto contra las que compensar.
 */
const MODELOS_SOLO_DEVOLUCION = new Set(['100', 'D-100', '200']);

/** Resultados de Notion en los que el dinero va a favor del cliente. */
const RESULTADOS_NEGATIVOS = new Set(['A devolver', 'A compensar']);

/** El modelo sale a favor del cliente. */
export function esResultadoNegativo(
  resultado: string | null,
  importe: number | null,
): boolean {
  if (resultado != null && RESULTADOS_NEGATIVOS.has(resultado)) return true;
  return importe != null && importe < 0;
}

/** "4T 2026" -> 4. Devuelve null si el periodo no es un trimestre. */
export function trimestreDePeriodo(periodo: string): number | null {
  const m = periodo.match(/^([1-4])T\s*\d{4}$/i);
  return m ? Number(m[1]) : null;
}

/**
 * Lo que hace falta saber para decidir cómo se cobra o se paga un modelo. Es
 * un subconjunto de Vencimiento para poder aplicar las reglas también durante
 * el mapeo, antes de que el vencimiento esté completo.
 */
export type DatosCobro = Pick<
  Vencimiento,
  | 'modelo'
  | 'periodo'
  | 'resultado'
  | 'importe'
  | 'formaPago'
  | 'redeme'
  | 'ivaMensual'
  | 'tipoCliente'
  | 'clienteConCertificado'
>;

/**
 * Modelos que solo informan de lo que se ha retenido a terceros. El dinero no
 * es del cliente: lo ha retenido a sus trabajadores, a sus profesionales o a
 * su casero, así que Hacienda no deja aplazar su ingreso.
 */
const MODELOS_RETENCIONES = new Set(['111', '115', '123', '180', '190']);

/** Formas societarias: Hacienda les admite la mitad de cuotas. */
const TIPOS_SOCIEDAD = new Set(['SL', 'SLU', 'Comunidad de Bienes']);

/** Cuotas máximas de un aplazamiento: 12 para autónomos, 6 para sociedades. */
export function maxCuotas(tipoCliente: string | null | undefined): number {
  return TIPOS_SOCIEDAD.has((tipoCliente ?? '').trim()) ? 6 : 12;
}

/** Un modelo de retenciones, que no se puede aplazar. */
export function esRetencion(modelo: string): boolean {
  return MODELOS_RETENCIONES.has(modelo);
}

export interface OpcionCobro {
  /** Opción exacta del select "Forma pago/cobro" de Notion. */
  valor: string;
  etiqueta: string;
  pideIban: boolean;
  /** Advertencia que acompaña a la opción. */
  aviso?: string;
}

const OPCION_DEVOLUCION: OpcionCobro = {
  valor: FORMA_COBRO_DEVOLUCION,
  etiqueta: 'Que me lo devuelvan a mi cuenta',
  pideIban: true,
  aviso: 'La cuenta debe estar a tu nombre.',
};

const OPCION_COMPENSAR: OpcionCobro = {
  valor: FORMA_COBRO_COMPENSAR,
  etiqueta: 'Compensarlo en las próximas declaraciones',
  pideIban: false,
};

/** Texto de ayuda cuando el cliente sí puede elegir entre devolver y compensar. */
export const AYUDA_DEVOLVER_O_COMPENSAR =
  'La devolución puede tardar unos meses y Hacienda puede pedir justificantes. ' +
  'Si compensas, lo descontarás de declaraciones futuras.';

/**
 * El IVA solo se puede pedir de vuelta en la última declaración del año, salvo
 * que el cliente esté en REDEME o declare mes a mes: entonces puede pedirla
 * siempre. En el resto de trimestres el saldo se arrastra, no se elige.
 */
function ivaPuedeElegir(v: DatosCobro): boolean {
  if (v.redeme || v.ivaMensual) return true;
  const trimestre = trimestreDePeriodo(v.periodo);
  // Sin trimestre reconocible (periodos mensuales o anuales) no se fuerza la
  // compensación: que elija, que es lo que menos puede perjudicarle.
  return trimestre === null || trimestre === 4;
}

/**
 * Las opciones que se le ofrecen al cliente. Lista vacía significa que no hay
 * nada que elegir: o no procede, o la ley solo deja un camino.
 *
 * Esta función es la única fuente de verdad: la usan la pantalla de borradores
 * para pintar los radios y el endpoint de conformidad para rechazar una forma
 * de cobro que no toca.
 */
export function opcionesFormaPago(v: DatosCobro): OpcionCobro[] {
  if (esResultadoNegativo(v.resultado, v.importe)) {
    // "A compensar" es una decisión ya tomada: no se vuelve a preguntar.
    if (v.resultado === 'A compensar') return [];
    if (MODELOS_SOLO_DEVOLUCION.has(v.modelo)) return [OPCION_DEVOLUCION];
    if (v.modelo === '303') {
      return ivaPuedeElegir(v) ? [OPCION_DEVOLUCION, OPCION_COMPENSAR] : [];
    }
    // El 130 y los demás pagos a cuenta se arrastran solos dentro del año.
    return [];
  }

  if (v.resultado === 'A pagar') {
    const opciones: OpcionCobro[] = [
      {
        valor: FORMA_PAGO_DOMICILIACION,
        etiqueta: 'Domiciliar el pago en mi cuenta',
        pideIban: true,
      },
      { valor: FORMA_PAGO_NRC, etiqueta: 'Pagar yo desde mi banco', pideIban: false },
    ];

    // Las retenciones no se aplazan: ese dinero no es suyo, se lo ha retenido
    // a otros y Hacienda no admite fraccionar su ingreso.
    if (!esRetencion(v.modelo)) {
      opciones.push({
        valor: FORMA_PAGO_APLAZAMIENTO,
        etiqueta: 'Solicitar un aplazamiento',
        pideIban: true,
        aviso:
          v.modelo === '303'
            ? 'El IVA solo puede aplazarse si acreditas que no has cobrado el IVA de tus facturas. Explícalo en el motivo.'
            : undefined,
      });
    }

    return opciones;
  }

  return [];
}

/* -----------------------------------------------------------------
 * Aplazamiento
 * ----------------------------------------------------------------- */

export const AYUDA_APLAZAMIENTO =
  'Hacienda carga las cuotas el día 5 o 20 de cada mes. La fecha final la ' +
  'fija Hacienda al conceder el aplazamiento.';

export interface DatosAplazamiento {
  cuotas?: number | null;
  /** "YYYY-MM" o "YYYY-MM-01". */
  primeraCuota?: string | null;
  motivo?: string | null;
}

/**
 * Los meses en los que puede empezar a pagar: los seis siguientes al actual.
 * El mes en curso no entra porque el aplazamiento todavía tiene que
 * concederlo Hacienda.
 */
export function mesesPrimeraCuota(referencia: string = mesActual()): string[] {
  return [1, 2, 3, 4, 5, 6].map((n) => sumarMeses(referencia, n));
}

/** Deja "2026-10" o "2026-10-01" en "2026-10". */
function mesDe(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const m = valor.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(m) ? m : null;
}

/**
 * Comprueba los datos de un aplazamiento. Devuelve el error en cristiano, o
 * null si está todo bien. La usan el formulario y el endpoint: así no puede
 * colarse por la API algo que la pantalla no dejaría enviar.
 */
export function validarAplazamiento(
  v: DatosCobro,
  datos: DatosAplazamiento,
  referencia: string = mesActual(),
): string | null {
  if (esRetencion(v.modelo)) {
    return `El modelo ${v.modelo} es de retenciones y no se puede aplazar`;
  }

  const tope = maxCuotas(v.tipoCliente);
  const cuotas = datos.cuotas;
  if (cuotas == null || !Number.isInteger(cuotas) || cuotas < 2 || cuotas > tope) {
    return `El número de cuotas tiene que estar entre 2 y ${tope}`;
  }

  const mes = mesDe(datos.primeraCuota);
  if (!mes || !mesesPrimeraCuota(referencia).includes(mes)) {
    return 'La primera cuota tiene que ser en alguno de los seis próximos meses';
  }

  if (!datos.motivo?.trim()) {
    return 'Necesitamos que nos expliques el motivo del aplazamiento';
  }

  return null;
}

/* -----------------------------------------------------------------
 * Informativos y resultado cero
 * ----------------------------------------------------------------- */

/** Declaración que solo informa: no hay nada que pagar ni que cobrar. */
export function esInformativo(v: DatosCobro): boolean {
  return v.resultado === 'Informativo';
}

/** Sale a cero: se presenta, pero no hay movimiento de dinero. */
export function esCero(v: DatosCobro): boolean {
  if (esInformativo(v) || esResultadoNegativo(v.resultado, v.importe)) return false;
  return v.resultado === 'Cero' || v.importe === 0;
}

/**
 * Sin importe grande en la tarjeta: enseñar "0,00 €" a tamaño titular en una
 * informativa solo confunde.
 */
export function sinImporteDestacado(v: DatosCobro): boolean {
  return esInformativo(v) || esCero(v);
}

export const TEXTO_REVISION = 'He revisado los datos del borrador y son correctos';

/**
 * Estas declaraciones no tienen ninguna decisión que tomar, así que la
 * conformidad se apoya en una casilla: que confirme que ha mirado los datos.
 */
export function requiereRevision(v: DatosCobro): boolean {
  return esInformativo(v) || esCero(v);
}

/** Lo que conviene que revise en cada informativa antes de confirmarla. */
const AVISOS_INFORMATIVOS: Record<string, string> = {
  '347':
    'Comprueba que los importes coinciden con los de tus clientes y proveedores: Hacienda cruza los datos de las dos partes.',
  '349':
    'Comprueba que los NIF intracomunitarios de tus clientes y proveedores son correctos y están en vigor.',
  '390': 'Este resumen debe coincidir con la suma de tus modelos 303 del año.',
  '180':
    'Comprueba que los datos de tus arrendadores y los importes retenidos son correctos.',
  '190':
    'Comprueba que los datos de los perceptores y los importes retenidos son correctos.',
};

export function avisoInformativo(v: DatosCobro): string | null {
  return AVISOS_INFORMATIVOS[v.modelo] ?? null;
}

/**
 * La forma de cobro que se aplica sola, sin preguntar, al dar la conformidad.
 * Es el caso del IVA negativo fuera del cuarto trimestre: solo cabe arrastrar
 * el saldo, así que se deja escrito en Notion en vez de dejarlo en blanco.
 */
export function formaPagoAutomatica(v: DatosCobro): string | null {
  if (!esResultadoNegativo(v.resultado, v.importe)) return null;
  if (opcionesFormaPago(v).length > 0) return null;
  if (v.resultado === 'A compensar' || v.modelo === '303') {
    return FORMA_COBRO_COMPENSAR;
  }
  // El 130 se descuenta solo en los siguientes pagos a cuenta: no hay ninguna
  // forma de cobro que anotar.
  return null;
}

/** Formas de pago/cobro admisibles para este modelo y periodo. */
export function formasPagoPermitidas(v: DatosCobro): string[] {
  const opciones = opcionesFormaPago(v).map((o) => o.valor);
  const automatica = formaPagoAutomatica(v);
  if (automatica && !opciones.includes(automatica)) opciones.push(automatica);
  return opciones;
}

export type DestinoNegativo = 'compensar' | 'devolver';

/** Qué se va a hacer con un resultado a favor del cliente. */
export function destinoNegativo(v: DatosCobro): DestinoNegativo | null {
  if (!esResultadoNegativo(v.resultado, v.importe)) return null;
  if (v.formaPago === FORMA_COBRO_DEVOLUCION) return 'devolver';
  if (v.formaPago === FORMA_COBRO_COMPENSAR) return 'compensar';
  if (v.resultado === 'A compensar') return 'compensar';
  if (MODELOS_SOLO_DEVOLUCION.has(v.modelo)) return 'devolver';
  // Todavía sin decidir: se enseña lo que dice el resultado del modelo.
  if (opcionesFormaPago(v).length > 0) {
    return v.resultado === 'A devolver' ? 'devolver' : 'compensar';
  }
  return 'compensar';
}

/**
 * El importe tal y como se le enseña al cliente. Los resultados a su favor
 * llevan siempre el signo menos, venga el número de Notion con signo o sin él.
 */
export function importeConSigno(v: DatosCobro): number | null {
  if (v.importe == null) return null;
  return esResultadoNegativo(v.resultado, v.importe)
    ? -Math.abs(v.importe)
    : v.importe;
}

/**
 * "-450,25 € a compensar" para listados y calendario. Una informativa no
 * lleva importe: lo que tenga en ese campo no es dinero que deba nadie.
 */
export function etiquetaImporte(v: DatosCobro): string | null {
  if (esInformativo(v)) return 'Informativo';
  const importe = importeConSigno(v);
  if (importe == null) return null;
  const destino = destinoNegativo(v);
  if (!destino) return euros(importe);
  return `${euros(importe)} a ${destino === 'devolver' ? 'devolver' : 'compensar'}`;
}

/**
 * La línea que explica el resultado en la tarjeta del borrador, sea cual sea:
 * informativa, cero, a favor del cliente o a pagar.
 */
export function textoResultado(v: DatosCobro): string {
  if (esInformativo(v)) {
    return 'Declaración informativa · No hay nada que pagar';
  }
  if (esCero(v)) return `Resultado: ${euros(0)}`;
  return textoResultadoNegativo(v) ?? v.resultado ?? 'Resultado';
}

/**
 * La explicación en cristiano de un resultado a favor del cliente: qué pasa
 * ahora con ese dinero. Devuelve null si el modelo no sale a su favor.
 */
export function textoResultadoNegativo(v: DatosCobro): string | null {
  if (!esResultadoNegativo(v.resultado, v.importe)) return null;

  // El 130 no depende de lo que se elija, porque aquí no se elige nada.
  if (v.modelo === '130' || v.modelo === '131') {
    return trimestreDePeriodo(v.periodo) === 4
      ? 'Resultado negativo: se tendrá en cuenta en tu declaración de la Renta.'
      : 'Resultado negativo: se descontará en los próximos trimestres de este año.';
  }

  // Ya decidido: se cuenta lo que se va a hacer, no lo que se podría hacer.
  if (v.formaPago === FORMA_COBRO_DEVOLUCION) {
    return 'A devolver: Hacienda te lo ingresará en la cuenta que nos has indicado.';
  }
  if (v.formaPago === FORMA_COBRO_COMPENSAR) {
    return v.modelo === '303'
      ? 'A compensar. Se descontará de tus próximas declaraciones de IVA.'
      : 'A compensar. Se descontará de tus próximas declaraciones.';
  }

  if (MODELOS_SOLO_DEVOLUCION.has(v.modelo)) {
    return 'A devolver: Hacienda te lo ingresará en la cuenta que nos indiques.';
  }

  if (v.modelo === '303' && opcionesFormaPago(v).length === 0) {
    return 'A compensar. Se descontará de tus próximas declaraciones de IVA.';
  }

  if (opcionesFormaPago(v).length > 0) {
    return 'Sale a tu favor: puedes pedir la devolución o compensarlo más adelante.';
  }

  return 'Sale a tu favor.';
}

/**
 * Un NRC son 22 caracteres alfanuméricos que devuelve el banco al pagar.
 */
export const PATRON_NRC = /^[0-9A-Z]{22}$/;

/** Normaliza lo que teclea el cliente: sin espacios y en mayúsculas. */
export function limpiarNrc(nrc: string): string {
  return nrc.replace(/[\s-]/g, '').toUpperCase();
}

/**
 * Fecha real en la que hay que presentar.
 *
 * Domiciliar el pago obliga a presentar antes del día 15, no del 20: la AEAT
 * necesita margen para ordenar el cargo. Se aplica solo si adelanta el plazo,
 * nunca para retrasarlo.
 */
export function fechaLimitePresentacion(
  fechaLimite: string | null,
  formaPago: string | null,
): string | null {
  const limite = soloFecha(fechaLimite);
  if (!limite) return null;
  if (formaPago !== FORMA_PAGO_DOMICILIACION) return limite;

  const dia15 = `${limite.slice(0, 8)}15`;
  return dia15 < limite ? dia15 : limite;
}

/**
 * Plazo de conformidad por defecto: tres días naturales desde que se publica
 * el borrador, pero nunca más tarde del día anterior a la fecha en que hay que
 * presentar, para que quede margen. Con domiciliación ese tope es el día 14,
 * porque se presenta el 15.
 */
export function calcularPlazoConformidad(
  fechaPublicacion: string | null,
  fechaLimite: string | null,
  formaPago: string | null = null,
): string | null {
  const publicacion = soloFecha(fechaPublicacion);
  if (!publicacion) return null;

  const porDefecto = sumarDias(publicacion, 3);
  const limite = fechaLimitePresentacion(fechaLimite, formaPago);
  if (!limite) return porDefecto;

  const tope = sumarDias(limite, -1);
  return porDefecto <= tope ? porDefecto : tope;
}

/**
 * El título tiene la forma "Cliente - Modelo - Periodo". Se coge el penúltimo
 * segmento en vez de buscar tres dígitos sueltos, porque hay modelos que no
 * son numéricos ("Cuentas anuales", "Legalización libros") y porque el nombre
 * del cliente puede llevar números.
 */
function modeloDesdeTitulo(titulo: string): string {
  const partes = titulo.split(' - ').map((p) => p.trim());
  if (partes.length >= 3) return partes[partes.length - 2];
  return partes[0] ?? titulo;
}

function periodoDesdeTitulo(titulo: string): string {
  const partes = titulo.split(' - ').map((p) => p.trim());
  return partes.length >= 3 ? partes[partes.length - 1] : '';
}

type VencimientoBase = Omit<
  Vencimiento,
  | 'pasos'
  | 'progreso'
  | 'esperaConformidad'
  | 'presentado'
  | 'pagaElCliente'
  | 'pagado'
  | 'diasParaLimite'
>;

/**
 * Orden real del recorrido. "pago" va entre la conformidad y la presentación
 * porque sin NRC no se puede presentar; solo se muestra cuando paga el
 * cliente, pero está siempre en el orden para que el arrastre hacia atrás
 * funcione.
 */
export const ORDEN_PASOS: ClavePaso[] = [
  'documentacion',
  'borrador',
  'conformidad',
  'pago',
  'presentacion',
  'cargo',
  'devolucion',
  'aplazamiento',
];

/**
 * Qué pasos están completados, ya con el arrastre hacia atrás aplicado.
 *
 * El recorrido es secuencial, así que un paso posterior completado implica los
 * anteriores. Sin esto, un modelo del histórico (presentado antes de que
 * existiera el portal, sin marcar la documentación ni la conformidad) sale con
 * "Tu conformidad · Pendiente" meses después de haberse presentado.
 */
function calcularProgreso(v: VencimientoBase): Record<ClavePaso, boolean> {
  const h = hoy();
  const presentado =
    !!v.fechaPresentacion || v.estado === 'Presentado' || v.estado === 'Domiciliado';

  const progreso: Record<ClavePaso, boolean> = {
    documentacion: v.documentacionCompleta,
    borrador: v.borradorEnviado || !!v.borradorUrl || !!v.fechaPublicacionBorrador,
    conformidad: !!v.conformidadFecha,
    pago: !!v.fechaPago,
    presentacion: presentado,
    cargo: !!v.fechaCargo && soloFecha(v.fechaCargo)! <= h,
    // "Fecha cargo" guarda el movimiento en los dos sentidos: lo que sale de
    // su cuenta y lo que Hacienda le ingresa.
    devolucion: !!v.fechaCargo && soloFecha(v.fechaCargo)! <= h,
    // El aplazamiento no está cerrado hasta que Hacienda empieza a cobrar.
    aplazamiento: !!v.fechaCargo && soloFecha(v.fechaCargo)! <= h,
  };

  for (let i = ORDEN_PASOS.length - 2; i >= 0; i--) {
    if (progreso[ORDEN_PASOS[i + 1]]) progreso[ORDEN_PASOS[i]] = true;
  }
  return progreso;
}

/** Si el pago corre a cargo del cliente: NRC y sin certificado digital. */
function pagaElCliente(v: VencimientoBase): boolean {
  return v.formaPago === FORMA_PAGO_NRC && !v.clienteConCertificado;
}

/**
 * Si el recorrido incluye el paso de cargo en cuenta. Un modelo que sale a
 * favor del cliente nunca lo tiene: de su cuenta no sale dinero.
 */
function tieneCargo(v: VencimientoBase, presentado: boolean): boolean {
  if (esResultadoNegativo(v.resultado, v.importe)) return false;
  return !!v.fechaCargo || (v.resultado === 'A pagar' && !presentado);
}

/**
 * "Solicitado · 6 cuotas desde Octubre 2026". La fecha final no se promete:
 * la fija Hacienda al conceder el aplazamiento.
 */
function detalleAplazamiento(v: VencimientoBase): string {
  const desde = v.aplazamientoPrimeraCuota
    ? nombreMes(soloFecha(v.aplazamientoPrimeraCuota)!.slice(0, 7))
    : null;

  if (v.fechaCargo) {
    return v.aplazamientoCuotas
      ? `Concedido · ${v.aplazamientoCuotas} cuotas`
      : 'Concedido';
  }
  if (v.aplazamientoCuotas && desde) {
    return `Solicitado · ${v.aplazamientoCuotas} cuotas desde ${desde}`;
  }
  return 'Solicitado';
}

function construirPasos(v: VencimientoBase): Paso[] {
  const presentado =
    !!v.fechaPresentacion || v.estado === 'Presentado' || v.estado === 'Domiciliado';
  const conformidadDada = !!v.conformidadFecha;
  const hechos = calcularProgreso(v);
  const paganEllos = pagaElCliente(v);
  // Si paga el cliente no hay cargo en cuenta: el dinero sale cuando paga él.
  const hayCargo = !paganEllos && tieneCargo(v, presentado);
  /*
   * Con el saldo a favor compensado el recorrido termina en la presentación:
   * no hay movimiento de dinero, el importe se arrastra a la siguiente
   * declaración. Solo si pide la devolución hay un paso más que esperar.
   */
  const hayDevolucion = destinoNegativo(v) === 'devolver';
  // Pedido a plazos: el último paso cuenta el aplazamiento, no un cargo único.
  const hayAplazamiento = v.formaPago === FORMA_PAGO_APLAZAMIENTO;

  function detalleConformidad(): string {
    if (conformidadDada) return `Dada el ${fechaHoraLarga(v.conformidadFecha)}`;
    // Dado por hecho porque ya se presentó, pero sin conformidad registrada:
    // no se afirma que la diera, que es prueba ante el cliente.
    if (hechos.conformidad) return 'Sin registro en el portal';
    return v.plazoConformidad
      ? `Antes del ${fechaLarga(v.plazoConformidad)}`
      : 'Pendiente';
  }

  const definicion: Array<{ clave: ClavePaso; titulo: string; detalle: string }> = [
    {
      clave: 'documentacion',
      titulo: 'Documentación',
      detalle: hechos.documentacion ? 'Completa' : 'Pendiente de completar',
    },
    {
      clave: 'borrador',
      titulo: 'Borrador',
      detalle: hechos.borrador
        ? v.fechaPublicacionBorrador
          ? `Publicado el ${fechaLarga(v.fechaPublicacionBorrador)}`
          : 'Publicado'
        : 'Lo preparamos nosotros',
    },
    {
      clave: 'conformidad',
      titulo: 'Tu conformidad',
      detalle: detalleConformidad(),
    },
    {
      clave: 'pago',
      titulo: 'Tu pago',
      detalle: v.fechaPago
        ? `Pagado el ${fechaLarga(v.fechaPago)}`
        : // Dado por hecho porque ya se presentó, pero sin pago registrado:
          // no se afirma una fecha de pago que no tenemos.
          hechos.pago
          ? 'Sin registro en el portal'
          : v.fechaLimitePresentacion
            ? `Antes del ${fechaLarga(v.fechaLimitePresentacion)}`
            : 'Con la carta de pago',
    },
    {
      clave: 'presentacion',
      titulo: 'Presentación',
      detalle: presentado
        ? v.fechaPresentacion
          ? `Presentado el ${fechaLarga(v.fechaPresentacion)}`
          : 'Presentado'
        : v.fechaLimitePresentacion
          ? `Antes del ${fechaLarga(v.fechaLimitePresentacion)}`
          : 'La hacemos nosotros',
    },
    {
      clave: 'cargo',
      titulo: 'Cargo en cuenta',
      detalle: v.fechaCargo ? fechaLarga(v.fechaCargo) : 'Pendiente',
    },
    {
      clave: 'devolucion',
      titulo: 'Devolución',
      detalle: v.fechaCargo
        ? `Ingresada el ${fechaLarga(v.fechaCargo)}`
        : 'Pendiente de Hacienda',
    },
    {
      clave: 'aplazamiento',
      titulo: 'Aplazamiento',
      detalle: detalleAplazamiento(v),
    },
  ];

  /*
   * Pasos visibles: siempre los cuatro primeros. "Tu pago" solo si paga el
   * cliente, "Cargo en cuenta" solo si lo cobran de su cuenta y "Devolución"
   * solo si el dinero viene de vuelta. Los tres son excluyentes entre sí.
   */
  const visibles = definicion.filter((p) => {
    if (p.clave === 'pago') return paganEllos && !hayAplazamiento;
    if (p.clave === 'cargo') return hayCargo && !hayAplazamiento;
    if (p.clave === 'devolucion') return hayDevolucion;
    if (p.clave === 'aplazamiento') return hayAplazamiento;
    return true;
  });
  const primeraPendiente = visibles.findIndex((p) => !hechos[p.clave]);

  return visibles.map((p, i) => ({
    ...p,
    estado: hechos[p.clave]
      ? ('hecho' as const)
      : i === primeraPendiente
        ? ('ahora' as const)
        : ('pendiente' as const),
  }));
}

export interface ContextoCliente {
  /**
   * Viene de "Certificado digital" en BD - Clientes. Con certificado pagamos
   * nosotros; sin él, el cliente paga con la carta de pago.
   */
  clienteConCertificado?: boolean;
  /**
   * "REDEME" en BD - Clientes: inscrito en el registro de devolución mensual
   * del IVA, así que puede pedir la devolución en cualquier periodo.
   */
  redeme?: boolean;
  /** "Periodicidad IVA" = Mensual: mismo efecto que el REDEME. */
  ivaMensual?: boolean;
  /**
   * "Tipo de cliente" en BD - Clientes. Un autónomo puede aplazar en hasta 12
   * cuotas y una sociedad en 6.
   */
  tipoCliente?: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Convierte una página de Notion en un Vencimiento. Exportada para poder
 * comprobar el mapeo sin tocar la base real. */
export function mapear(page: any, contexto: ContextoCliente = {}): Vencimiento {
  const props = page.properties ?? {};
  const texto = (k: string): string | null =>
    props[k]?.rich_text?.[0]?.plain_text?.trim() || null;
  const fecha = (k: string): string | null => props[k]?.date?.start ?? null;

  const titulo: string = props['Título']?.title?.[0]?.plain_text ?? 'Sin título';
  const modelo = modeloDesdeTitulo(titulo);
  const fechaLimite = fecha('Fecha límite');
  const fechaPublicacionBorrador = fecha('Fecha publicación borrador');
  const plazoEnNotion = fecha('Plazo conformidad');
  const formaPago: string | null = props['Forma pago/cobro']?.select?.name ?? null;

  const base: VencimientoBase = {
    id: page.id as string,
    titulo,
    modelo,
    modeloDescripcion: MODELOS[modelo] ?? modelo,
    // "Periodo" es rich_text y va sin tilde en Notion; el título es el respaldo.
    periodo: texto('Periodo') ?? periodoDesdeTitulo(titulo),
    fechaLimite,
    fechaLimitePresentacion: fechaLimitePresentacion(fechaLimite, formaPago),
    domiciliado: formaPago === FORMA_PAGO_DOMICILIACION,
    estado: props['Estado']?.select?.name ?? 'Pendiente',

    documentacionCompleta: props['Documentación completa']?.checkbox ?? false,
    borradorEnviado: props['Borrador enviado']?.checkbox ?? false,
    borradorUrl: props['Borrador URL']?.url ?? null,
    fechaPublicacionBorrador,

    plazoConformidad:
      soloFecha(plazoEnNotion) ??
      calcularPlazoConformidad(fechaPublicacionBorrador, fechaLimite, formaPago),
    plazoConformidadEstimado: !plazoEnNotion,
    conformidadFecha: fecha('Conformidad fecha'),
    conformidadPor: texto('Conformidad por'),

    fechaPresentacion: fecha('Fecha presentación real'),
    justificanteUrl: props['Justificante AEAT']?.url ?? null,
    referenciaPresentacion: texto('Nº referencia presentación'),
    fechaCargo: fecha('Fecha cargo'),

    cartaPagoUrl: props['Carta de pago URL']?.url ?? null,
    nrc: texto('NRC'),
    fechaPago: fecha('Fecha pago'),
    justificantePagoUrl: props['Justificante pago URL']?.url ?? null,
    clienteConCertificado: contexto.clienteConCertificado ?? false,

    resultado: props['Resultado modelo']?.select?.name ?? null,
    importe: props['Importe a ingresar']?.number ?? null,
    formaPago,
    iban: texto('IBAN'),
    confirmacionCliente: props['Confirmación cliente']?.select?.name ?? null,
    notasCliente: texto('Notas cliente'),

    aplazamientoCuotas: props['Aplazamiento cuotas']?.number ?? null,
    aplazamientoPrimeraCuota: fecha('Aplazamiento primera cuota'),
    aplazamientoMotivo: texto('Aplazamiento motivo'),

    redeme: contexto.redeme ?? false,
    ivaMensual: contexto.ivaMensual ?? false,
    tipoCliente: contexto.tipoCliente ?? null,
    esNegativo: esResultadoNegativo(
      props['Resultado modelo']?.select?.name ?? null,
      props['Importe a ingresar']?.number ?? null,
    ),
  };

  const presentado =
    !!base.fechaPresentacion ||
    base.estado === 'Presentado' ||
    base.estado === 'Domiciliado';

  return {
    ...base,
    pasos: construirPasos(base),
    progreso: calcularProgreso(base),
    presentado,
    pagaElCliente: pagaElCliente(base),
    pagado: !!base.fechaPago,
    esperaConformidad:
      !presentado &&
      !base.conformidadFecha &&
      (base.borradorEnviado || !!base.borradorUrl || !!base.fechaPublicacionBorrador),
    diasParaLimite: base.fechaLimite
      ? diasEntre(hoy(), soloFecha(base.fechaLimite)!)
      : null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Borradores publicados que esperan la conformidad del cliente. */
export function borradoresPendientes(vencimientos: Vencimiento[]): Vencimiento[] {
  return vencimientos.filter((v) => v.esperaConformidad);
}

/** Justificantes ya disponibles, del más reciente al más antiguo. */
export function justificantes(vencimientos: Vencimiento[]): Vencimiento[] {
  return vencimientos
    .filter((v) => v.presentado)
    .sort((a, b) =>
      (soloFecha(b.fechaPresentacion) ?? soloFecha(b.fechaLimite) ?? '').localeCompare(
        soloFecha(a.fechaPresentacion) ?? soloFecha(a.fechaLimite) ?? '',
      ),
    );
}

/** Vencimientos aún abiertos cuya fecha límite no ha pasado. */
export function proximosVencimientos(
  vencimientos: Vencimiento[],
  limite = 6,
): Vencimiento[] {
  const h = hoy();
  return vencimientos
    .filter((v) => !v.presentado && (!v.fechaLimite || soloFecha(v.fechaLimite)! >= h))
    .slice(0, limite);
}

/**
 * El vencimiento que protagoniza el seguimiento de la portada: el borrador
 * que espera conformidad; si no hay, el próximo a vencer.
 */
export function vencimientoDestacado(
  vencimientos: Vencimiento[],
): Vencimiento | null {
  return (
    borradoresPendientes(vencimientos)[0] ??
    proximosVencimientos(vencimientos, 1)[0] ??
    null
  );
}

/**
 * Cómo se nombra un vencimiento en la interfaz: "Modelo 303 · IVA". Los que no
 * son un modelo numérico ("Cuentas anuales", "Legalización libros") van solos,
 * sin el prefijo ni la descripción repetida.
 */
export function etiquetaModelo(v: Vencimiento): string {
  if (v.modeloDescripcion === v.modelo) return v.modelo;
  return `Modelo ${v.modelo} · ${v.modeloDescripcion}`;
}

/** Etiqueta de estado en cristiano, para los chips de la interfaz. */
export function etiquetaEstado(v: Vencimiento): {
  texto: string;
  tono: 'ok' | 'warn' | 'alert' | 'neutral';
} {
  if (v.presentado) return { texto: 'Presentado', tono: 'ok' };
  if (v.conformidadFecha) return { texto: 'Conformidad dada', tono: 'ok' };
  if (v.esperaConformidad) {
    const plazo = v.plazoConformidad;
    const vencido = plazo != null && plazo < hoy();
    return {
      texto: vencido ? 'Conformidad fuera de plazo' : 'Esperando tu conformidad',
      tono: vencido ? 'alert' : 'warn',
    };
  }
  if (v.documentacionCompleta) return { texto: 'En preparación', tono: 'neutral' };
  return { texto: 'Programado', tono: 'neutral' };
}
