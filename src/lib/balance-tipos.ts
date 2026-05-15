export interface FilaBalance {
  codigo: string;
  descripcion: string;
  nivel: 1 | 2 | 3;
  esCabecera: boolean;
  esTotal: boolean;
  valorActual: number | null;
  valorAnterior: number | null;
  variacion: number | null;
  seccion: 'activo' | 'pasivo' | 'pyg';
}

const IGNORAR = [
  'balance de situación', 'cuenta de pérdidas', 'empresa:', 'domicilio',
  'periodo:', 'fecha:', 'n.i.f', 'formulario', 'informe de',
];

function parseNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '' || v === '-') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? null : n;
}

export function parseExcelFilas(rows: unknown[], seccion: FilaBalance['seccion']): FilaBalance[] {
  if (!Array.isArray(rows)) return [];
  const filas: FilaBalance[] = [];

  for (const rawRow of rows) {
    if (!Array.isArray(rawRow)) continue;
    const row = rawRow as unknown[];

    const col0 = String(row[0] ?? '').trim();
    const col1 = String(row[1] ?? '').trim();
    const col2 = String(row[2] ?? '').trim();
    const col3 = String(row[3] ?? '').trim();
    const col4 = parseNum(row[4]);
    const col5 = parseNum(row[5]);
    const col6 = parseNum(row[6]);

    // Ignorar filas completamente vacías
    if (!col0 && !col1 && !col2 && !col3) continue;

    // Ignorar filas sin valores numéricos
    if (col4 === null && col5 === null) continue;

    // Ignorar cabeceras
    const textoFila = (col0 + ' ' + col1 + ' ' + col2).toLowerCase();
    if (IGNORAR.some(h => textoFila.includes(h))) continue;

    let nivel: 1 | 2 | 3 = 1;
    let codigo = col0;
    let descripcion = col1 || col2;

    if (/^\d{9}$/.test(col2)) {
      // Cuenta individual (9 dígitos numéricos en col2)
      nivel = 3;
      codigo = col2;
      descripcion = col3 || col2;
    } else if (col0 && /\b[IVX]+\b/.test(col0)) {
      // Subgrupo con número romano: "A) I", "B)  II  ", "I", "II"
      nivel = 2;
      codigo = col0;
      descripcion = col2 || col1;
    } else {
      // Grupo principal: "A)", "B)", o línea sin código
      nivel = 1;
      codigo = col0;
      descripcion = col1 || col2;
    }

    const esTotal = (col0 + col1).toUpperCase().includes('TOTAL');

    filas.push({
      codigo,
      descripcion,
      nivel,
      esCabecera: false,
      esTotal,
      valorActual: col4,
      valorAnterior: col5,
      variacion: col6,
      seccion,
    });
  }

  return filas;
}
