export type TonoChip = 'ok' | 'warn' | 'alert' | 'neutral';

/**
 * Etiqueta de estado. Usa las clases globales de globals.css para que se vea
 * igual en todas las vistas.
 */
export default function Chip({
  tono = 'neutral',
  children,
}: {
  tono?: TonoChip;
  children: React.ReactNode;
}) {
  return <span className={`chip chip-${tono}`}>{children}</span>;
}
