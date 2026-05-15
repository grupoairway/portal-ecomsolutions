export interface MetricasInforme {
  ingresos: { actual: number; anterior: number; variacion: number };
  gastos_personal: { actual: number; anterior: number; variacion: number };
  otros_gastos: { actual: number; anterior: number; variacion: number };
  resultado_explotacion: { actual: number; anterior: number; variacion: number };
  resultado_ejercicio: { actual: number; anterior: number; variacion: number };
  total_activo: { actual: number; anterior: number; variacion: number };
  caja: { actual: number; anterior: number; variacion: number };
  clientes_deudores: { actual: number; anterior: number; variacion: number };
  patrimonio_neto: { actual: number; anterior: number; variacion: number };
  deudas_cp: { actual: number; anterior: number; variacion: number };
  proveedores: { actual: number; anterior: number; variacion: number };
}

export interface InformeNotion {
  id: string;
  periodo: string;
  ejercicio: string;
  fechaSubida: string;
  metricasJSON: string | null;
  balanceJSON: string | null;
  pygJSON: string | null;
}

function parseMetrica(m: unknown): { actual: number; anterior: number; variacion: number } {
  const obj = m as { actual?: unknown; anterior?: unknown; variacion?: unknown; porcentaje?: unknown } | null | undefined;
  const parseNum = (v: unknown): number => {
    const n = parseFloat(String(v ?? 0).replace(',', '.'));
    return isNaN(n) ? 0 : n;
  };
  return {
    actual: parseNum(obj?.actual),
    anterior: parseNum(obj?.anterior),
    variacion: parseNum(obj?.variacion ?? obj?.porcentaje),
  };
}

const defaultMetrica = { actual: 0, anterior: 0, variacion: 0 };

export function parseMetricas(json: string): MetricasInforme {
  try {
    const data = JSON.parse(json)
    const b = data.balance || {}
    const p = data.pyg || {}
    return {
      ingresos:              parseMetrica(p.ingresos),
      gastos_personal:       parseMetrica(p.gastosPersonal),
      otros_gastos:          parseMetrica(p.otrosGastos),
      resultado_explotacion: parseMetrica(p.resultadoExplotacion),
      resultado_ejercicio:   parseMetrica(p.resultadoEjercicio),
      total_activo:          parseMetrica(b.totalActivo),
      caja:                  parseMetrica(b.caja),
      clientes_deudores:     parseMetrica(b.clientesDeudores),
      patrimonio_neto:       parseMetrica(b.patrimonioNeto),
      deudas_cp:             parseMetrica(b.deudasCP),
      proveedores:           parseMetrica(b.proveedores),
    }
  } catch {
    return {
      ingresos:              defaultMetrica,
      gastos_personal:       defaultMetrica,
      otros_gastos:          defaultMetrica,
      resultado_explotacion: defaultMetrica,
      resultado_ejercicio:   defaultMetrica,
      total_activo:          defaultMetrica,
      caja:                  defaultMetrica,
      clientes_deudores:     defaultMetrica,
      patrimonio_neto:       defaultMetrica,
      deudas_cp:             defaultMetrica,
      proveedores:           defaultMetrica,
    }
  }
}
