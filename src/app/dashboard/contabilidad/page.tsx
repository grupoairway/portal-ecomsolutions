import { requireSession } from '@/lib/session-server';
import BotonInvitacion from './BotonInvitacion';

/**
 * Quantum es donde vive la facturación y la contabilidad; el portal solo
 * enlaza. Las URL salen de variables de entorno: si no están configuradas no
 * se pinta un botón muerto.
 */
export default async function ContabilidadPage() {
  await requireSession();

  const quantumUrl = process.env.NEXT_PUBLIC_QUANTUM_URL ?? null;
  const appUrl = process.env.NEXT_PUBLIC_QUANTUM_APP_URL ?? null;

  return (
    <>
      <h1 className="page-title">Mi contabilidad</h1>
      <p className="lead">
        Tu facturación y tu contabilidad están en Quantum, el programa que
        usamos juntos.
      </p>

      <div className="grid2">
        <section className="panel">
          <h2 className="panel-title">En Quantum puedes</h2>
          <div className="row">
            <div>Emitir facturas con VERI*FACTU</div>
          </div>
          <div className="row">
            <div>Subir facturas de gastos y tickets, también desde el móvil</div>
          </div>
          <div className="row">
            <div>Ver ingresos, gastos, tesorería y resultados</div>
          </div>

          <div className="actions" style={{ marginTop: 12 }}>
            {quantumUrl && (
              <a
                href={quantumUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
              >
                Abrir Quantum
              </a>
            )}
            {appUrl && (
              <a
                href={appUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
              >
                Descargar la app
              </a>
            )}
            {!quantumUrl && (
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>
                Entra con el enlace que te enviamos por correo cuando diste de
                alta el servicio.
              </p>
            )}
          </div>
        </section>

        <section className="panel">
          <h2 className="panel-title">¿Olvidaste tu acceso?</h2>
          <p style={{ margin: '0 0 12px', color: 'var(--muted)' }}>
            Te reenviamos la invitación a tu correo.
          </p>
          <BotonInvitacion />
        </section>
      </div>
    </>
  );
}
