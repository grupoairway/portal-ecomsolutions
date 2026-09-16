/**
 * Identificación del cliente de pruebas.
 *
 * Todos los avisos al gestor que nazcan de "CLIENTE PRUEBA" llevan [PRUEBA]
 * delante del asunto, para que en la bandeja de info@ecomsolutions.es se
 * distingan de un aviso real de un cliente de verdad.
 */

const NOMBRE_PRUEBA = 'CLIENTE PRUEBA';
const EMAIL_PRUEBA = process.env.CLIENTE_PRUEBA_EMAIL ?? 'grupoairway@gmail.com';

export interface IdentidadCliente {
  nombre?: string | null;
  email?: string | null;
}

export function esClientePrueba(cliente: IdentidadCliente): boolean {
  if ((cliente.nombre ?? '').trim().toUpperCase() === NOMBRE_PRUEBA) return true;
  const email = (cliente.email ?? '').trim().toLowerCase();
  return email !== '' && email === EMAIL_PRUEBA.toLowerCase();
}

/**
 * Asunto de un correo al gestor, marcado si viene del cliente de pruebas.
 * Se aplica dentro del mailer para que ninguna ruta pueda saltárselo.
 */
export function asuntoGestor(asunto: string, cliente: IdentidadCliente): string {
  return esClientePrueba(cliente) ? `[PRUEBA] ${asunto}` : asunto;
}
