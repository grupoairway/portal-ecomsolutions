import { NextResponse } from 'next/server';

/**
 * ENDPOINT DESACTIVADO.
 *
 * Escribía en "Forma pago/cobro" valores que no son opciones del select en
 * Notion ("Voluntario", "Compensar próximas presentaciones"), y Notion los
 * habría dado de alta como opciones nuevas, ensuciando la base. Tampoco
 * guardaba la conformidad con fecha y hora, que es prueba ante el cliente.
 *
 * Lo sustituye POST /api/borradores/[id]/conformidad, que valida la forma de
 * pago contra las opciones reales y comprueba que el vencimiento es del
 * cliente de la sesión.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        'Esta forma de confirmar ya no está disponible. Entra en el portal y da tu conformidad desde "Borradores y justificantes".',
      sustituidoPor: '/api/borradores/[id]/conformidad',
    },
    { status: 410 },
  );
}
