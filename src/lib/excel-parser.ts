import * as XLSX from 'xlsx';

export interface FilaContable {
  codigo: string;
  descripcion: string;
  valorActual: number;
  valorAnterior: number;
  variacion: number | null;
  tipo: 'grupo' | 'subgrupo' | 'cuenta' | 'total';
  nivel: number;
}

export interface HojaContable {
  nombre: string;
  filas: FilaContable[];
}

export interface BalanceData {
  activo: HojaContable;
  pasivo: HojaContable;
  metricas: {
    totalActivo: number;
    totalActivoAnterior: number;
    patrimoniaNeto: number;
    patrimoniaNetoAnterior: number;
    cajaDisponible: number;
    cajaDisponibleAnterior: number;
    deudasCorto: number;
    deudasCortoAnterior: number;
  };
}

export interface PyGData {
  hoja: HojaContable;
  metricas: {
    ingresos: number;
    ingresosAnterior: number;
    resultado: number;
    resultadoAnterior: number;
  };
}

function limpiarNumero(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const str = String(val).replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, '');
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

function inferirTipo(codigoA: string): 'grupo' | 'subgrupo' | 'cuenta' | 'total' {
  const limpio = codigoA.trim();
  if (/^\d{9}$/.test(limpio)) return 'cuenta';
  if (/^[A-Z]\)\s*[IVX]+/.test(limpio)) return 'subgrupo';
  if (/^(CAL|TOTAL)/.test(limpio.toUpperCase())) return 'total';
  return 'grupo';
}

function parsearHoja(wb: XLSX.WorkBook, nombreHoja: string): HojaContable {
  const ws = wb.Sheets[nombreHoja];
  if (!ws) return { nombre: nombreHoja, filas: [] };

  const datos: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: '',
  }) as unknown[][];

  const filas: FilaContable[] = [];

  for (const fila of datos) {
    const colA = String(fila[0] ?? '').trim();
    const colB = String(fila[1] ?? '').trim();

    if (!colA && !colB) continue;

    const valorActual = limpiarNumero(fila[fila.length - 3]);
    const valorAnterior = limpiarNumero(fila[fila.length - 2]);
    const variacionRaw = fila[fila.length - 1];
    const variacion =
      variacionRaw !== '' && variacionRaw !== null && variacionRaw !== undefined
        ? limpiarNumero(variacionRaw)
        : null;

    if (valorActual === 0 && valorAnterior === 0 && variacion === null) continue;

    const tipo = inferirTipo(colA);
    const nivel =
      tipo === 'grupo' ? 1 : tipo === 'subgrupo' ? 2 : tipo === 'total' ? 1 : 3;

    filas.push({
      codigo: colA,
      descripcion: colB || colA,
      valorActual,
      valorAnterior,
      variacion,
      tipo,
      nivel,
    });
  }

  return { nombre: nombreHoja, filas };
}

function buscarMetrica(
  filas: FilaContable[],
  predicado: (f: FilaContable) => boolean,
): { actual: number; anterior: number } {
  const fila = filas.find(predicado);
  return {
    actual: fila?.valorActual ?? 0,
    anterior: fila?.valorAnterior ?? 0,
  };
}

export function parseBalance(buffer: Buffer): BalanceData {
  const wb = XLSX.read(buffer, { type: 'buffer' });

  const activoNombre =
    wb.SheetNames.find((n) => n.includes('A C T I V O') || n.toLowerCase().includes('activo')) ??
    wb.SheetNames[0];
  const pasivoNombre =
    wb.SheetNames.find((n) => n.includes('P A S I V O') || n.toLowerCase().includes('pasivo')) ??
    wb.SheetNames[1];

  const activo = parsearHoja(wb, activoNombre);
  const pasivo = parsearHoja(wb, pasivoNombre);

  const totalActivoM = buscarMetrica(
    activo.filas,
    (f) => f.tipo === 'total' && /total.*activo/i.test(f.descripcion + f.codigo),
  );
  const patrimonioM = buscarMetrica(
    pasivo.filas,
    (f) => /^A[\s)]/i.test(f.codigo) && /patrimonio/i.test(f.descripcion),
  );
  const cajaM = buscarMetrica(
    activo.filas,
    (f) => /^B[\s)]*VI/i.test(f.codigo),
  );
  const deudasCortoM1 = buscarMetrica(
    pasivo.filas,
    (f) => /^C[\s)]*II/i.test(f.codigo),
  );
  const deudasCortoM2 = buscarMetrica(
    pasivo.filas,
    (f) => /^C[\s)]*IV/i.test(f.codigo),
  );

  return {
    activo,
    pasivo,
    metricas: {
      totalActivo: totalActivoM.actual,
      totalActivoAnterior: totalActivoM.anterior,
      patrimoniaNeto: patrimonioM.actual,
      patrimoniaNetoAnterior: patrimonioM.anterior,
      cajaDisponible: cajaM.actual,
      cajaDisponibleAnterior: cajaM.anterior,
      deudasCorto: deudasCortoM1.actual + deudasCortoM2.actual,
      deudasCortoAnterior: deudasCortoM1.anterior + deudasCortoM2.anterior,
    },
  };
}

export function parsePyG(buffer: Buffer): PyGData {
  const wb = XLSX.read(buffer, { type: 'buffer' });

  const pygNombre =
    wb.SheetNames.find((n) => n.toLowerCase().includes('pyg') || n.toLowerCase().includes('p y g')) ??
    wb.SheetNames[0];

  const hoja = parsearHoja(wb, pygNombre);

  const ingresosM = buscarMetrica(
    hoja.filas,
    (f) => /A01/i.test(f.codigo),
  );
  const resultadoM = buscarMetrica(
    hoja.filas,
    (f) => /^D[\s)]/i.test(f.codigo) && /resultado.*ejercicio/i.test(f.descripcion),
  );

  return {
    hoja,
    metricas: {
      ingresos: ingresosM.actual,
      ingresosAnterior: ingresosM.anterior,
      resultado: resultadoM.actual,
      resultadoAnterior: resultadoM.anterior,
    },
  };
}
