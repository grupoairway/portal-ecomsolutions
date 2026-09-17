/**
 * Métricas de los informes en el formato v1.
 *
 * Solo queda vivo para la demo comercial (/dashboard-demo) y para el análisis
 * con IA y el PDF que cuelgan de ella. Las cifras del portal salen de
 * evolucion-tipos.ts, que sigue el contrato v2 con el panel.
 */
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
