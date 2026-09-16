import Link from 'next/link';
import { requireSession } from '@/lib/session-server';
import { getPerfilCliente } from '@/lib/notion';
import {
  borradoresPendientes,
  etiquetaEstado,
  etiquetaModelo,
  proximosVencimientos,
  vencimientoDestacado,
  getVencimientos,
} from '@/lib/vencimientos';
import { euros, fechaLarga, hoy } from '@/lib/fechas';
import Seguimiento from '@/components/Seguimiento';
import Chip from '@/components/Chip';

/** "Autónomo Directa Simplificada · IRPF en directa simplificada · Plan Autónomo Pro" */
function lineaPerfil(perfil: {
  tipoCliente: string | null;
  regimenIrpf: string | null;
  plan: string | null;
} | null): string {
  if (!perfil) return '';
  const partes = [
    perfil.tipoCliente,
    perfil.regimenIrpf && perfil.regimenIrpf !== 'No aplica'
      ? `IRPF en ${perfil.regimenIrpf.toLowerCase()}`
      : null,
    // El plan se guarda con el precio ("Autónomo Pro 50€"); al cliente le basta
    // el nombre.
    perfil.plan ? `Plan ${perfil.plan.replace(/\s*\d+\s*€\s*$/, '')}` : null,
  ].filter(Boolean);
  return partes.join(' · ');
}

export default async function InicioPage() {
  const session = await requireSession();

  const [perfil, vencimientos] = await Promise.all([
    getPerfilCliente(session.clienteId),
    getVencimientos(session.clienteId).catch(() => []),
  ]);

  const nombre =
    session.nombre && session.nombre !== 'Cliente'
      ? session.nombre
      : (perfil?.nombre ?? 'Cliente');

  const pendientes = borradoresPendientes(vencimientos);
  const destacado = vencimientoDestacado(vencimientos);
  const proximos = proximosVencimientos(vencimientos, 5);
  const quantumUrl = process.env.NEXT_PUBLIC_QUANTUM_URL ?? null;
  const h = hoy();

  return (
    <>
      <h1 style={{ fontSize: 28, lineHeight: 1.2, margin: '0 0 4px', fontWeight: 700 }}>
        Hola, {nombre}
      </h1>
      <p className="lead">{lineaPerfil(perfil)}</p>

      {/* NECESITAMOS DE TI */}
      {pendientes.length > 0 ? (
        <section className="panel panel-todo">
          <h2 className="panel-title">Necesitamos de ti</h2>
          {pendientes.map((v) => {
            const fueraDePlazo =
              v.plazoConformidad != null && v.plazoConformidad < h;
            return (
              <div className="row" key={v.id}>
                <div>
                  Dar conformidad al borrador del modelo {v.modelo} de {v.periodo}
                  <small>
                    {v.plazoConformidad
                      ? `${fueraDePlazo ? 'El plazo venció el' : 'Plazo:'} ${fechaLarga(v.plazoConformidad)}`
                      : 'Sin plazo fijado'}
                  </small>
                </div>
                <Link href={`/dashboard/borradores#v-${v.id}`} className="btn">
                  Revisar borrador
                </Link>
              </div>
            );
          })}
        </section>
      ) : (
        <section className="panel">
          <h2 className="panel-title">No necesitamos nada de ti</h2>
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            Ahora mismo no tienes nada pendiente. Cuando publiquemos un borrador
            para que lo revises, te avisaremos por correo y aparecerá aquí.
          </p>
        </section>
      )}

      {/* SEGUIMIENTO */}
      {destacado && (
        <section className="panel">
          <h2 className="panel-title">
            {etiquetaModelo(destacado)} · {destacado.periodo}
          </h2>
          <Seguimiento vencimiento={destacado} />
        </section>
      )}

      <div className="grid2">
        {/* PROXIMOS VENCIMIENTOS */}
        <section className="panel">
          <h2 className="panel-title">Próximos vencimientos</h2>
          {proximos.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--muted)' }}>
              No tienes vencimientos abiertos.
            </p>
          ) : (
            proximos.map((v) => {
              const etiqueta = etiquetaEstado(v);
              return (
                <div className="row" key={v.id}>
                  <div>
                    {etiquetaModelo(v)} · {v.periodo}
                    <small>
                      {v.fechaLimite
                        ? `Hasta el ${fechaLarga(v.fechaLimite)}`
                        : 'Sin fecha límite'}
                      {v.importe != null ? ` · ${euros(v.importe)}` : ''}
                    </small>
                  </div>
                  <Chip tono={etiqueta.tono}>{etiqueta.texto}</Chip>
                </div>
              );
            })
          )}
        </section>

        {/* QUANTUM */}
        <section className="panel">
          <h2 className="panel-title">Tu negocio en Quantum</h2>
          <p style={{ margin: '0 0 14px', color: 'var(--muted)' }}>
            Tus facturas, tus gastos y tus resultados se consultan en Quantum,
            siempre actualizados. Aquí solo gestionamos lo que tiene plazo.
          </p>
          <div className="actions">
            {quantumUrl ? (
              <a
                href={quantumUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
              >
                Abrir Quantum
              </a>
            ) : (
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                Si no recuerdas tu acceso a Quantum, escríbenos desde Consultas y
                te reenviamos la invitación.
              </span>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
