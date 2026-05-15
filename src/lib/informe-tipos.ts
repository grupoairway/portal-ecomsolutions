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

const defaultMetrica = { actual: 0, anterior: 0, variacion: 0 };

const defaultMetricas: MetricasInforme = {
  ingresos: defaultMetrica,
  gastos_personal: defaultMetrica,
  otros_gastos: defaultMetrica,
  resultado_explotacion: defaultMetrica,
  resultado_ejercicio: defaultMetrica,
  total_activo: defaultMetrica,
  caja: defaultMetrica,
  clientes_deudores: defaultMetrica,
  patrimonio_neto: defaultMetrica,
  deudas_cp: defaultMetrica,
  proveedores: defaultMetrica,
};

export function parseMetricas(json: string): MetricasInforme {
  console.log('Parseando métricas, input length:', json?.length)
  console.log('Input preview:', json?.substring(0, 100))
  try {
    const data = JSON.parse(json) as Partial<MetricasInforme>;
    console.log('Parse OK, claves:', Object.keys(data))
    return {
      ingresos: data.ingresos || defaultMetrica,
      gastos_personal: data.gastos_personal || defaultMetrica,
      otros_gastos: data.otros_gastos || defaultMetrica,
      resultado_explotacion: data.resultado_explotacion || defaultMetrica,
      resultado_ejercicio: data.resultado_ejercicio || defaultMetrica,
      total_activo: data.total_activo || defaultMetrica,
      caja: data.caja || defaultMetrica,
      clientes_deudores: data.clientes_deudores || defaultMetrica,
      patrimonio_neto: data.patrimonio_neto || defaultMetrica,
      deudas_cp: data.deudas_cp || defaultMetrica,
      proveedores: data.proveedores || defaultMetrica,
    };
  } catch (e) {
    console.log('Parse ERROR:', e)
    return defaultMetricas;
  }
}
