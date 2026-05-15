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

export function parseMetricas(json: string): MetricasInforme {
  const defaultMetrica = { actual: 0, anterior: 0, variacion: 0 }
  try {
    const data = JSON.parse(json)
    const b = data.balance || {}
    const p = data.pyg || {}
    return {
      ingresos:              p.ingresos              || defaultMetrica,
      gastos_personal:       p.gastosPersonal        || defaultMetrica,
      otros_gastos:          p.otrosGastos           || defaultMetrica,
      resultado_explotacion: p.resultadoExplotacion  || defaultMetrica,
      resultado_ejercicio:   p.resultadoEjercicio    || defaultMetrica,
      total_activo:          b.totalActivo           || defaultMetrica,
      caja:                  b.caja                  || defaultMetrica,
      clientes_deudores:     b.clientesDeudores      || defaultMetrica,
      patrimonio_neto:       b.patrimonioNeto        || defaultMetrica,
      deudas_cp:             b.deudasCP              || defaultMetrica,
      proveedores:           b.proveedores           || defaultMetrica,
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
