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
 *   5. Cargo en cuenta -> "Fecha cargo"
 *
 * Este módulo es puro: no habla con Notion, así que puede importarse
 * también desde componentes de cliente. Las consultas están en vencimientos.ts.
 */

import { fechaHoraLarga, fechaLarga, hoy, soloFecha, sumarDias, diasEntre } from './fechas';

export type EstadoPaso = 'hecho' | 'ahora' | 'pendiente';

export type ClavePaso =
  | 'documentacion'
  | 'borrador'
  | 'conformidad'
  | 'presentacion'
  | 'cargo';

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

  resultado: string | null;
  importe: number | null;
  formaPago: string | null;
  iban: string | null;
  confirmacionCliente: string | null;
  notasCliente: string | null;

  /** Los cinco pasos del seguimiento, ya resueltos. */
  pasos: Paso[];
  /** Hay borrador publicado y el cliente aún no ha dado conformidad. */
  esperaConformidad: boolean;
  /** Ya presentado (o domiciliado). */
  presentado: boolean;
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

/**
 * Plazo de conformidad por defecto: tres días naturales desde que se publica
 * el borrador, pero nunca más tarde del día anterior a la fecha límite, para
 * que quede margen de presentar.
 */
export function calcularPlazoConformidad(
  fechaPublicacion: string | null,
  fechaLimite: string | null,
): string | null {
  const publicacion = soloFecha(fechaPublicacion);
  if (!publicacion) return null;

  const porDefecto = sumarDias(publicacion, 3);
  const limite = soloFecha(fechaLimite);
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
  'pasos' | 'esperaConformidad' | 'presentado' | 'diasParaLimite'
>;

function construirPasos(v: VencimientoBase): Paso[] {
  const h = hoy();
  const presentado =
    !!v.fechaPresentacion || v.estado === 'Presentado' || v.estado === 'Domiciliado';
  const borradorPublicado =
    v.borradorEnviado || !!v.borradorUrl || !!v.fechaPublicacionBorrador;
  const conformidadDada = !!v.conformidadFecha;

  const orden: ClavePaso[] = [
    'documentacion',
    'borrador',
    'conformidad',
    'presentacion',
    'cargo',
  ];

  const constancia: Record<ClavePaso, boolean> = {
    documentacion: v.documentacionCompleta,
    borrador: borradorPublicado,
    conformidad: conformidadDada,
    presentacion: presentado,
    cargo: !!v.fechaCargo && soloFecha(v.fechaCargo)! <= h,
  };

  /*
   * El recorrido es secuencial, así que un paso posterior completado implica
   * los anteriores. Sin esto, un modelo del histórico (presentado antes de que
   * existiera el portal, sin marcar la documentación ni la conformidad) sale
   * con "Tu conformidad · Pendiente" meses después de haberse presentado.
   */
  const hechos = { ...constancia };
  for (let i = orden.length - 2; i >= 0; i--) {
    if (hechos[orden[i + 1]]) hechos[orden[i]] = true;
  }

  /* El cargo solo forma parte del recorrido si hay algo que pagar y sabemos
   * cuándo; en el histórico no consta y no tiene sentido mostrarlo. */
  const hayCargo = !!v.fechaCargo || (v.resultado === 'A pagar' && !presentado);

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
      clave: 'presentacion',
      titulo: 'Presentación',
      detalle: presentado
        ? v.fechaPresentacion
          ? `Presentado el ${fechaLarga(v.fechaPresentacion)}`
          : 'Presentado'
        : v.fechaLimite
          ? `Antes del ${fechaLarga(v.fechaLimite)}`
          : 'La hacemos nosotros',
    },
    {
      clave: 'cargo',
      titulo: 'Cargo en cuenta',
      detalle: v.fechaCargo ? fechaLarga(v.fechaCargo) : 'Pendiente',
    },
  ];

  const visibles = hayCargo ? definicion : definicion.slice(0, 4);
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

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Convierte una página de Notion en un Vencimiento. Exportada para poder
 * comprobar el mapeo sin tocar la base real. */
export function mapear(page: any): Vencimiento {
  const props = page.properties ?? {};
  const texto = (k: string): string | null =>
    props[k]?.rich_text?.[0]?.plain_text?.trim() || null;
  const fecha = (k: string): string | null => props[k]?.date?.start ?? null;

  const titulo: string = props['Título']?.title?.[0]?.plain_text ?? 'Sin título';
  const modelo = modeloDesdeTitulo(titulo);
  const fechaLimite = fecha('Fecha límite');
  const fechaPublicacionBorrador = fecha('Fecha publicación borrador');
  const plazoEnNotion = fecha('Plazo conformidad');

  const base: VencimientoBase = {
    id: page.id as string,
    titulo,
    modelo,
    modeloDescripcion: MODELOS[modelo] ?? modelo,
    // "Periodo" es rich_text y va sin tilde en Notion; el título es el respaldo.
    periodo: texto('Periodo') ?? periodoDesdeTitulo(titulo),
    fechaLimite,
    estado: props['Estado']?.select?.name ?? 'Pendiente',

    documentacionCompleta: props['Documentación completa']?.checkbox ?? false,
    borradorEnviado: props['Borrador enviado']?.checkbox ?? false,
    borradorUrl: props['Borrador URL']?.url ?? null,
    fechaPublicacionBorrador,

    plazoConformidad:
      soloFecha(plazoEnNotion) ??
      calcularPlazoConformidad(fechaPublicacionBorrador, fechaLimite),
    plazoConformidadEstimado: !plazoEnNotion,
    conformidadFecha: fecha('Conformidad fecha'),
    conformidadPor: texto('Conformidad por'),

    fechaPresentacion: fecha('Fecha presentación real'),
    justificanteUrl: props['Justificante AEAT']?.url ?? null,
    referenciaPresentacion: texto('Nº referencia presentación'),
    fechaCargo: fecha('Fecha cargo'),

    resultado: props['Resultado modelo']?.select?.name ?? null,
    importe: props['Importe a ingresar']?.number ?? null,
    formaPago: props['Forma pago/cobro']?.select?.name ?? null,
    iban: texto('IBAN'),
    confirmacionCliente: props['Confirmación cliente']?.select?.name ?? null,
    notasCliente: texto('Notas cliente'),
  };

  const presentado =
    !!base.fechaPresentacion ||
    base.estado === 'Presentado' ||
    base.estado === 'Domiciliado';

  return {
    ...base,
    pasos: construirPasos(base),
    presentado,
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
