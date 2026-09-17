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
