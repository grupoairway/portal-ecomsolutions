import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session-server';
import { getPerfilCliente } from '@/lib/notion';
import {
  asegurarFilaMes,
  confirmarCierre,
  estaConfirmado,
  getCierreMes,
  mesesConfirmables,
  nombreMes,
  plazoCierre,
} from '@/lib/cierres';
import { hoy } from '@/lib/fechas';
import { sendCierreGestor } from '@/lib/mailer';

interface Cuerpo {
  /** "YYYY-MM". */
  mes?: string;
  tipo?: string;
  observaciones?: string;
}

const TIPOS = ['Confirmado', 'Sin movimientos'] as const;
type Tipo = (typeof TIPOS)[number];

/**
 * Confirmación de la documentación de un mes.
 *
 * Solo se admiten los tres meses ya cerrados: el mes en curso todavía no ha
 * terminado y los anteriores a esos ya no son cosa del cliente. La fila se
 * localiza siempre por la relación con el cliente de la sesión, así que no se
 * puede escribir en el mes de otro.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { mes, tipo, observaciones } = (await req.json()) as Cuerpo;

  if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
    return NextResponse.json({ error: 'Mes no válido' }, { status: 400 });
  }

  if (!tipo || !TIPOS.includes(tipo as Tipo)) {
    return NextResponse.json(
      { error: 'Tipo de confirmación no válido' },
      { status: 400 },
    );
  }

  if (!mesesConfirmables().includes(mes)) {
    return NextResponse.json(
      { error: 'Ese mes no se puede confirmar desde el portal' },
      { status: 400 },
    );
  }

  const perfil = await getPerfilCliente(session.clienteId);
  const clienteNombre =
    session.nombre && session.nombre !== 'Cliente'
      ? session.nombre
      : (perfil?.nombre ?? 'Cliente');

  try {
    const existente = await getCierreMes(session.clienteId, mes);

    // La confirmación es prueba ante el cliente: no se sobrescribe una ya
    // dada, igual que la conformidad de los borradores.
    if (estaConfirmado(existente)) {
      return NextResponse.json(
        { error: `Ya habías confirmado ${nombreMes(mes).toLowerCase()}` },
        { status: 409 },
      );
    }

    const cierre =
      existente ??
      (await asegurarFilaMes(session.clienteId, clienteNombre, mes));

    const fechaConfirmacion = await confirmarCierre(cierre.id, {
      tipo: tipo as Tipo,
      observaciones,
      clienteNombre,
      clienteEmail: session.email,
    });

    // El aviso al gestor no debe tumbar la confirmación, que ya está guardada.
    try {
      await sendCierreGestor({
        clienteNombre,
        clienteEmail: session.email,
        periodo: nombreMes(mes),
        tipo: tipo as Tipo,
        observaciones: observaciones?.trim() || undefined,
        fueraDePlazo: plazoCierre(mes) < hoy(),
      });
    } catch (error) {
      console.error('Cierre guardado, pero el aviso al gestor falló:', error);
    }

    return NextResponse.json({ ok: true, fechaConfirmacion });
  } catch (error) {
    console.error('Error al guardar el cierre mensual en Notion:', error);
    return NextResponse.json(
      { error: 'No hemos podido guardar tu confirmación. Vuelve a intentarlo.' },
      { status: 502 },
    );
  }
}
