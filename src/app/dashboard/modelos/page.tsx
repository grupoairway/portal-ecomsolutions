import { permanentRedirect } from 'next/navigation';

/**
 * La confirmación de modelos vive ahora en "Borradores y justificantes", que
 * usa los campos de conformidad de Notion (fecha con hora y quién la dio).
 *
 * Esta ruta se mantiene solo para no romper enlaces antiguos: correos ya
 * enviados y marcadores del navegador.
 *
 * El componente ModelosClient sigue existiendo porque lo usa /dashboard-demo.
 */
export default function ModelosPage() {
  permanentRedirect('/dashboard/borradores');
}
