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

export function parseMetricas(metricasJSON: string): MetricasInforme | null {
  try {
    return JSON.parse(metricasJSON) as MetricasInforme;
  } catch {
    return null;
  }
}
