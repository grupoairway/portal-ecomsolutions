import { requireSession } from '@/lib/session-server';
import { getPerfilCliente } from '@/lib/notion';
import {
  borradoresPendientes,
  etiquetaModelo,
  justificantes,
  getVencimientos,
  type Vencimiento,
} from '@/lib/vencimientos';
import { fechaLarga } from '@/lib/fechas';
import BorradorCard from './BorradorCard';

export const dynamic = 'force-dynamic';

export default async function BorradoresPage() {
  const session = await requireSession();
  const [perfil, vencimientos] = await Promise.all([
    getPerfilCliente(session.clienteId),
    getVencimientos(session.clienteId).catch(() => [] as Vencimiento[]),
  ]);

  const pendientes = borradoresPendientes(vencimientos);
  // Conformidad ya dada pero todavía sin presentar.
  const conformados = vencimientos.filter(
    (v) => !v.presentado && v.conformidadFecha,
  );
  const presentados = justificantes(vencimientos);

  return (
    <>
      <h1 className="page-title">Borradores y justificantes</h1>
      <p className="lead">
        Nunca presentamos un impuesto sin tu conformidad. Revisa cada borrador y
        confírmalo o pregúntanos.
      </p>

      {pendientes.length === 0 && conformados.length === 0 && (
        <section className="panel">
          <h2 className="panel-title">No hay borradores esperándote</h2>
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            Cuando preparemos un modelo lo publicaremos aquí para que le des tu
            conformidad antes de presentarlo.
          </p>
        </section>
      )}

      {pendientes.map((v) => (
        <BorradorCard key={v.id} vencimiento={v} ibanCliente={perfil?.iban} />
      ))}

      {conformados.map((v) => (
        <BorradorCard key={v.id} vencimiento={v} ibanCliente={perfil?.iban} />
      ))}

      {/* JUSTIFICANTES */}
      <section className="panel">
        <h2 className="panel-title">Justificantes presentados</h2>
        {presentados.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            Aquí aparecerán los justificantes de todo lo que presentemos por ti.
          </p>
        ) : (
          presentados.map((v) => (
            <div className="row" key={v.id}>
              <div>
                {etiquetaModelo(v)} · {v.periodo}
                <small>
                  {v.fechaPresentacion
                    ? `Presentado el ${fechaLarga(v.fechaPresentacion)}`
                    : 'Presentado'}
                  {v.referenciaPresentacion
                    ? ` · Nº ${v.referenciaPresentacion}`
                    : ''}
                  {v.nrc ? ` · NRC ${v.nrc}` : ''}
                </small>
              </div>
              <div className="actions">
                {v.justificanteUrl ? (
                  <a
                    href={v.justificanteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost"
                  >
                    Descargar
                  </a>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                    Justificante en camino
                  </span>
                )}
                {v.justificantePagoUrl && (
                  <a
                    href={v.justificantePagoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost"
                  >
                    Justificante de pago
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </section>
    </>
  );
}
