import Link from 'next/link';
import { requireSession } from '@/lib/session-server';
import { getPerfilCliente, type PerfilCliente } from '@/lib/notion';
import {
  borradoresPendientes,
  etiquetaEstado,
  etiquetaModelo,
  proximosVencimientos,
  getVencimientos,
} from '@/lib/vencimientos';
import { periodoActivo, seguimientoPeriodo } from '@/lib/periodos';
import {
  getCierresCliente,
  mesEnFrase,
  mesesPendientes,
  plazoCierre,
} from '@/lib/cierres';
import { euros, fechaLarga, hoy } from '@/lib/fechas';
import Seguimiento from '@/components/Seguimiento';
import Chip from '@/components/Chip';

/**
 * Subtítulo de la portada, como en la maqueta: tipo de cliente · régimen ·
 * plan. Solo con lo que exista en BD - Clientes; los campos vacíos no dejan
 * huecos ni separadores sueltos.
 */
function lineaPerfil(perfil: PerfilCliente | null): string {
  if (!perfil) return '';

  const regimen =
    perfil.regimenIrpf && perfil.regimenIrpf !== 'No aplica'
      ? `Estimación ${perfil.regimenIrpf.toLowerCase()}`
      : perfil.regimenIva && perfil.regimenIva !== 'General'
        ? `IVA ${perfil.regimenIva.toLowerCase()}`
        : null;

  return [
    perfil.tipoCliente,
    regimen,
    // El plan se guarda con el precio ("Autónomo Pro 50€"); sobra aquí.
    perfil.plan ? `Plan ${perfil.plan.replace(/\s*\d+\s*€\s*$/, '')}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export default async function InicioPage() {
  const session = await requireSession();

  const [perfil, vencimientos, cierres] = await Promise.all([
    getPerfilCliente(session.clienteId),
    getVencimientos(session.clienteId).catch(() => []),
    getCierresCliente(session.clienteId).catch(() => []),
  ]);

  const nombre =
    session.nombre && session.nombre !== 'Cliente'
      ? session.nombre
      : (perfil?.nombre ?? 'Cliente');

  const pendientes = borradoresPendientes(vencimientos);
  // Ya dio su conformidad y ahora le toca pagar con la carta de pago: sin el
  // NRC no podemos presentar, así que es una tarea suya.
  const pagosPendientes = vencimientos.filter(
    (v) => v.pagaElCliente && !v.pagado && !v.presentado && !!v.conformidadFecha,
  );
  // Meses cerrados que el cliente aún no ha confirmado, del más antiguo al
  // más reciente: cada uno es una tarea suya con su propio plazo.
  const mesesSinConfirmar = mesesPendientes(cierres);
  const hayTareas =
    pendientes.length > 0 ||
    pagosPendientes.length > 0 ||
    mesesSinConfirmar.length > 0;
  const proximos = proximosVencimientos(vencimientos, 5);
  const periodo = periodoActivo(vencimientos);
  const seguimiento = periodo
    ? seguimientoPeriodo(vencimientos, periodo, cierres)
    : null;
  const quantumUrl = process.env.NEXT_PUBLIC_QUANTUM_URL ?? null;
  const h = hoy();

  return (
    <>
      <h1 className="page-title">Hola, {nombre}</h1>
      <p className="lead">{lineaPerfil(perfil)}</p>

      {/* NECESITAMOS DE TI */}
      {hayTareas ? (
        <section className="panel panel-todo">
          <h2 className="panel-title">Necesitamos de ti</h2>

          {pagosPendientes.map((v) => (
            <div className="row" key={`pago-${v.id}`}>
              <div>
                Pagar el modelo {v.modelo} con la carta de pago
                <small>
                  {v.fechaLimitePresentacion
                    ? `Antes del ${fechaLarga(v.fechaLimitePresentacion)}`
                    : 'Sin el NRC no podemos presentarlo'}
                  {v.importe != null ? ` · ${euros(v.importe)}` : ''}
                </small>
              </div>
              <Link href={`/dashboard/borradores#v-${v.id}`} className="btn">
                Pagar
              </Link>
            </div>
          ))}

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

          {mesesSinConfirmar.map((mes) => {
            const plazo = plazoCierre(mes);
            const vencido = plazo < h;
            return (
              <div className="row" key={`cierre-${mes}`}>
                <div>
                  Subir y confirmar la documentación de {mesEnFrase(mes)}
                  <small>
                    <span style={vencido ? { color: 'var(--alert)' } : undefined}>
                      {vencido
                        ? `El plazo venció el ${fechaLarga(plazo)}`
                        : `Plazo: ${fechaLarga(plazo)}`}
                    </span>
                    {' · Se sube en Quantum y se confirma aquí'}
                  </small>
                </div>
                <Link href="/dashboard/documentos" className="btn btn-ghost">
                  Confirmar documentación
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

      {/* SEGUIMIENTO DEL PERIODO */}
      {seguimiento && (
        <section className="panel">
          <h2 className="panel-title">{seguimiento.titulo}</h2>
          <Seguimiento pasos={seguimiento.pasos} />
          {seguimiento.vencimientos.length > 1 && (
            <p style={{ marginTop: 10, color: 'var(--muted)', fontSize: 13 }}>
              Incluye{' '}
              {seguimiento.vencimientos.map((v) => v.modelo).join(', ')}. Cada
              paso avanza cuando lo han completado todos.
            </p>
          )}
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
              const limite = v.fechaLimitePresentacion ?? v.fechaLimite;
              return (
                <div className="row" key={v.id}>
                  <div>
                    {etiquetaModelo(v)} · {v.periodo}
                    <small>
                      {limite ? `Hasta el ${fechaLarga(limite)}` : 'Sin fecha límite'}
                      {v.domiciliado ? ' · domiciliado' : ''}
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
            Facturación, gastos, tesorería y resultados se consultan en Quantum,
            siempre actualizados.
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
              <Link href="/dashboard/contabilidad" className="btn">
                Ver Quantum
              </Link>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
