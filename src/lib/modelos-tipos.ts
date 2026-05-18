export interface ModeloVencimiento {
  id: string;
  modelo: string;
  periodo: string;
  nombre: string;
  fechaLimite: string | null;
  estado: string;
  borradorUrl: string | null;
  resultadoModelo: string | null;
  importeAIngresar: number | null;
  confirmacionCliente: string | null;
  formaPago: string | null;
  iban: string | null;
}
